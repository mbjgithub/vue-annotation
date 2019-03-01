/* @flow */

import { genHandlers } from './events'
import baseDirectives from '../directives/index'
import { camelize, no, extend } from 'shared/util'
import { baseWarn, pluckModuleFunction } from '../helpers'
import html from '../../platforms/web/compiler/directives/html';

type TransformFunction = (el: ASTElement, code: string) => string;
type DataGenFunction = (el: ASTElement) => string;
type DirectiveFunction = (el: ASTElement, dir: ASTDirective, warn: Function) => boolean;

export class CodegenState {
  options: CompilerOptions;
  warn: Function;
  transforms: Array<TransformFunction>;
  dataGenFns: Array<DataGenFunction>;
  directives: { [key: string]: DirectiveFunction };
  maybeComponent: (el: ASTElement) => boolean;
  onceId: number;
  staticRenderFns: Array<string>;
  pre: boolean;

  constructor(options: CompilerOptions) {
    this.options = options
    this.warn = options.warn || baseWarn
    // 平台传入的transformCode
    this.transforms = pluckModuleFunction(options.modules, 'transformCode')
    // genData :
    // if (el.staticClass) {
    //   data += `staticClass:${el.staticClass},`
    // }
    // if (el.classBinding) {
    //   data += `class:${el.classBinding},`
    // }
    this.dataGenFns = pluckModuleFunction(options.modules, 'genData')
    this.directives = extend(extend({}, baseDirectives), options.directives)

    const isReservedTag = options.isReservedTag || no
    this.maybeComponent = (el: ASTElement) => !(isReservedTag(el.tag) && !el.component)  //非平台保留的tag或者明确是组件的
    this.onceId = 0
    this.staticRenderFns = []
    this.pre = false
  }
}

export type CodegenResult = {
  render: string,
  staticRenderFns: Array<string>
};
/**
 * ast ==》render&&staticRender
 * @param {*} ast
 * @param {*} options
 */
export function generate(
  ast: ASTElement | void,
  options: CompilerOptions
): CodegenResult {
  const state = new CodegenState(options)
  const code = ast ? genElement(ast, state) : '_c("div")'
  return {
    render: `with(this){return ${code}}`,
    staticRenderFns: state.staticRenderFns
  }
}

export function genElement(el: ASTElement, state: CodegenState): string {
  console.log('%%%%')
  if (el.parent) {
    el.pre = el.pre || el.parent.pre
  }

  if (el.staticRoot && !el.staticProcessed) {
    // 如果当前节点是静态节点的跟节点
    return genStatic(el, state)
  } else if (el.once && !el.onceProcessed) {
    // 生成v-once
    return genOnce(el, state)
  } else if (el.for && !el.forProcessed) {
    return genFor(el, state)
  } else if (el.if && !el.ifProcessed) {
    return genIf(el, state)
  } else if (el.tag === 'template' && !el.slotTarget && !state.pre) {
    return genChildren(el, state) || 'void 0'
  } else if (el.tag === 'slot') {
    return genSlot(el, state)
  } else {
    // component or element
    let code
    if (el.component) {  // 如果是component组件<component is="TestComps"></component>
      code = genComponent(el.component, el, state)
    } else {
      let data
      // plain为true表示元素上没有任何属性
      if (!el.plain || (el.pre && state.maybeComponent(el))) {
        data = genData(el, state)
      }
      // 生成字符串：'[_c,_c,...],normalizationType'
      const children = el.inlineTemplate ? null : genChildren(el, state, true)
      // _c(tag,data,children)
      code = `_c('${el.tag}'${
        data ? `,${data}` : '' // data
        }${
        children ? `,${children}` : '' // children
        })`
    }
    // module transforms
    for (let i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code)
    }
    return code
  }
}

// hoist static sub-trees out
function genStatic(el: ASTElement, state: CodegenState): string {
  el.staticProcessed = true
  // Some elements (templates) need to behave differently inside of a v-pre
  // node.  All pre nodes are static roots, so we can use this as a location to
  // wrap a state change and reset it upon exiting the pre node.
  const originalPreState = state.pre
  if (el.pre) {
    state.pre = el.pre
  }
  state.staticRenderFns.push(`with(this){return ${genElement(el, state)}}`)
  state.pre = originalPreState
  return `_m(${
    state.staticRenderFns.length - 1
    }${
    el.staticInFor ? ',true' : ''
    })`
}

// v-once
function genOnce(el: ASTElement, state: CodegenState): string {
  el.onceProcessed = true
  if (el.if && !el.ifProcessed) {
    return genIf(el, state)
  } else if (el.staticInFor) {
    let key = ''
    let parent = el.parent
    while (parent) {
      if (parent.for) {
        key = parent.key
        break
      }
      parent = parent.parent
    }
    if (!key) {
      process.env.NODE_ENV !== 'production' && state.warn(
        `v-once can only be used inside v-for that is keyed. `
      )
      return genElement(el, state)
    }
    return `_o(${genElement(el, state)},${state.onceId++},${key})`
  } else {
    return genStatic(el, state)
  }
}

export function genIf(
  el: any,
  state: CodegenState,
  altGen?: Function,
  altEmpty?: string
): string {
  el.ifProcessed = true // avoid recursion
  return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty)
}

function genIfConditions(
  conditions: ASTIfConditions,
  state: CodegenState,
  altGen?: Function,
  altEmpty?: string
): string {
  if (!conditions.length) {
    return altEmpty || '_e()'
  }

  const condition = conditions.shift()
  if (condition.exp) {
    return `(${condition.exp})?${
      genTernaryExp(condition.block)
      }:${
      genIfConditions(conditions, state, altGen, altEmpty)
      }`
  } else {
    return `${genTernaryExp(condition.block)}`
  }

  // v-if with v-once should generate code like (a)?_m(0):_m(1)
  function genTernaryExp(el) {
    return altGen
      ? altGen(el, state)
      : el.once
        ? genOnce(el, state)
        : genElement(el, state)
  }
}

export function genFor(
  el: any,
  state: CodegenState,
  altGen?: Function,
  altHelper?: string
): string {
  const exp = el.for
  const alias = el.alias
  const iterator1 = el.iterator1 ? `,${el.iterator1}` : ''
  const iterator2 = el.iterator2 ? `,${el.iterator2}` : ''

  if (process.env.NODE_ENV !== 'production' &&
    state.maybeComponent(el) &&
    el.tag !== 'slot' &&
    el.tag !== 'template' &&
    !el.key
  ) {
    state.warn(
      `<${el.tag} v-for="${alias} in ${exp}">: component lists rendered with ` +
      `v-for should have explicit keys. ` +
      `See https://vuejs.org/guide/list.html#key for more info.`,
      true /* tip */
    )
  }

  el.forProcessed = true // avoid recursion
  return `${altHelper || '_l'}((${exp}),` +
    `function(${alias}${iterator1}${iterator2}){` +
    `return ${(altGen || genElement)(el, state)}` +
    '})'
}

/**
 * 生成渲染函数中的data选项,如：<input type="text" v-model="person.name">的data
 * {
      directives: [{
          name: "model",
          rawName: "v-model",
          value: (person.name),
          expression: "person.name"
      }],
      attrs: {
          "type": "text"
      },
      domProps: {
          "value": (person.name)
      },
      on: {
          "input": function($event) {
              if ($event.target.composing)
                  return;
              $set(person, "name", $event.target.value)
          }
      }
  }
 * @param {*} el
 * @param {*} state
 *************          data包含的属性     *************
 * directives:[{name,rawName,value,expression}]   // 运行时需要关注的指令，需要跟dom绑定的，跟具体平台相关
 * key:'',
 * ref:'',
 * refInFor:true or false,
 * pre:true or false,
 * tag:'',
 * staticClass:'',
 * class:'',
 * staticStyle:'',
 * style:'',
 * attrs:{},      // data-index,username,id
 * domPorps:{},   // innerHtml,textContent,value
 * on:{input:function(){}},
 * nativeOn:{input:function(){}},
 * slot:[{}],
 * scopedSlots:[{}],
 * model:{value,callback,expression},  // 自定义组件或者component组件上的v-model
 */
export function genData(el: ASTElement, state: CodegenState): string {
  let data = '{'

  // directives first.
  // directives may mutate the el's other properties before they are generated.
  // v-html,v-text会被转化成props，而不是属于directives的定义
  // 自定义组件上的v-model会被转成:value="person.name",@input="e=>person.name=e"
  // 非自定义组件上的v-model依然需要运行时的处理，state与value的绑定，事件回调
  const dirs = genDirectives(el, state)
  if (dirs) data += dirs + ','

  // key
  if (el.key) {
    data += `key:${el.key},`
  }
  // ref
  if (el.ref) {
    data += `ref:${el.ref},`
  }
  if (el.refInFor) {
    data += `refInFor:true,`
  }
  // pre
  if (el.pre) {
    data += `pre:true,`
  }
  // record original tag name for components using "is" attribute
  // 表示是<component :is="testComps" />
  if (el.component) {
    data += `tag:"${el.tag}",`
  }
  // module data generation functions
  for (let i = 0; i < state.dataGenFns.length; i++) {
    data += state.dataGenFns[i](el)   // 执行平台传入的genData，如web平台，class和style都是要特殊处理滴
  }
  // attributes
  if (el.attrs) {
    data += `attrs:{${genProps(el.attrs)}},`
  }
  // DOM props
  if (el.props) {
    data += `domProps:{${genProps(el.props)}},`
  }
  // event handlers
  // 生成事件处理函数，包括运用各种修饰符，如stopPropagation，preventDefault，注意v-on是不处理传给v-on指令的param的
  // 这里生成事件处理函数分两步：
  // step1：有修饰符，加上修饰符对应动作code
  // step2：加上传递给v-on时候的函数
  // {on:{input:function(){}}}
  if (el.events) {
    data += `${genHandlers(el.events, false)},`
  }
  // {nativeOn:{input:function(){}}}
  if (el.nativeEvents) {
    data += `${genHandlers(el.nativeEvents, true)},`
  }
  // slot target
  // only for non-scoped slots
  if (el.slotTarget && !el.slotScope) {
    data += `slot:${el.slotTarget},`
  }
  // scoped slots
  if (el.scopedSlots) {
    data += `${genScopedSlots(el.scopedSlots, state)},`
  }
  // <component v-model="person.name" is="TestComps" />，<TestComps v-model="person.name" />
  // 自定义组件或者component组件上的v-model
  // el.model = {
  //   value: `(${value})`,
  //   expression: `"${value}"`,
  //   callback: `function (${baseValueExpression}) {${assignment}}`
  // }
  if (el.model) {
    data += `model:{value:${
      el.model.value
      },callback:${
      el.model.callback
      },expression:${
      el.model.expression
      }},`
  }
  // inline-template
  // TODO
  if (el.inlineTemplate) {
    const inlineTemplate = genInlineTemplate(el, state)
    if (inlineTemplate) {
      data += `${inlineTemplate},`
    }
  }
  data = data.replace(/,$/, '') + '}'
  // v-bind data wrap,这里会调用？TODO
  if (el.wrapData) {
    data = el.wrapData(data)
  }
  // v-on data wrap,这里会调用？TODO
  if (el.wrapListeners) {
    data = el.wrapListeners(data)
  }
  return data
}
/**
 * data中生成directives
 * @param {*} el
 * @param {*} state
 */
function genDirectives(el: ASTElement, state: CodegenState): string | void {
  const dirs = el.directives
  if (!dirs) return
  let res = 'directives:['
  let hasRuntime = false
  let i, l, dir, needRuntime
  for (i = 0, l = dirs.length; i < l; i++) {
    // dir={ name, rawName, value, arg, modifiers }
    dir = dirs[i]
    needRuntime = true
    const gen: DirectiveFunction = state.directives[dir.name]   // 调用平台传入的预处理指令函数函数
    if (gen) {
      // compile-time directive that manipulates AST.
      // returns true if it also needs a runtime counterpart.
      // v-html就是在el.props.push({name:'innerHtml',value})
      // 编译时就可以处理掉，不用到运行时去处理这些指令了
      // 不在自定义组件上的v-model的needRuntime为true，TODO
      needRuntime = !!gen(el, dir, state.warn)
    }
    // 需要运行时解析的指令，如自定义指令，不在自定义组件上的v-model
    if (needRuntime) {
      hasRuntime = true
      res += `{name:"${dir.name}",rawName:"${dir.rawName}"${
        dir.value ? `,value:(${dir.value}),expression:${JSON.stringify(dir.value)}` : ''
        }${
        dir.arg ? `,arg:"${dir.arg}"` : ''
        }${
        dir.modifiers ? `,modifiers:${JSON.stringify(dir.modifiers)}` : ''
        }},`
    }
  }
  if (hasRuntime) {
    return res.slice(0, -1) + ']'
  }
}

function genInlineTemplate(el: ASTElement, state: CodegenState): ?string {
  const ast = el.children[0]
  if (process.env.NODE_ENV !== 'production' && (
    el.children.length !== 1 || ast.type !== 1
  )) {
    state.warn('Inline-template components must have exactly one child element.')
  }
  if (ast.type === 1) {
    const inlineRenderFns = generate(ast, state.options)
    return `inlineTemplate:{render:function(){${
      inlineRenderFns.render
      }},staticRenderFns:[${
      inlineRenderFns.staticRenderFns.map(code => `function(){${code}}`).join(',')
      }]}`
  }
}

function genScopedSlots(
  slots: { [key: string]: ASTElement },
  state: CodegenState
): string {
  return `scopedSlots:_u([${
    Object.keys(slots).map(key => {
      return genScopedSlot(key, slots[key], state)
    }).join(',')
    }])`
}

function genScopedSlot(
  key: string,
  el: ASTElement,
  state: CodegenState
): string {
  if (el.for && !el.forProcessed) {
    return genForScopedSlot(key, el, state)
  }
  const fn = `function(${String(el.slotScope)}){` +
    `return ${el.tag === 'template'
      ? el.if
        ? `${el.if}?${genChildren(el, state) || 'undefined'}:undefined`
        : genChildren(el, state) || 'undefined'
      : genElement(el, state)
    }}`
  return `{key:${key},fn:${fn}}`
}

function genForScopedSlot(
  key: string,
  el: any,
  state: CodegenState
): string {
  const exp = el.for
  const alias = el.alias
  const iterator1 = el.iterator1 ? `,${el.iterator1}` : ''
  const iterator2 = el.iterator2 ? `,${el.iterator2}` : ''
  el.forProcessed = true // avoid recursion
  return `_l((${exp}),` +
    `function(${alias}${iterator1}${iterator2}){` +
    `return ${genScopedSlot(key, el, state)}` +
    '})'
}
/**
 * 生成字符串：'[_c,_c,...],normalizationType'
 * @param {*} el
 * @param {*} state
 * @param {*} checkSkip
 * @param {*} altGenElement
 * @param {*} altGenNode
 */
export function genChildren(
  el: ASTElement,
  state: CodegenState,
  checkSkip?: boolean,
  altGenElement?: Function,
  altGenNode?: Function
): string | void {
  const children = el.children
  if (children.length) {
    const el: any = children[0]
    // optimize single v-for
    // TODO ，这里优化了啥
    if (children.length === 1 &&
      el.for &&
      el.tag !== 'template' &&
      el.tag !== 'slot'
    ) {
      // because el may be a functional component and return an Array instead of a single root.
      // In this case, just a simple normalization is needed
      const normalizationType = state.maybeComponent(el) ? `,1` : ``
      return `${(altGenElement || genElement)(el, state)}${normalizationType}`
    }
    const normalizationType = checkSkip
      ? getNormalizationType(children, state.maybeComponent)
      : 0
    const gen = altGenNode || genNode
    return `[${children.map(c => gen(c, state)).join(',')}]${
      normalizationType ? `,${normalizationType}` : ''
      }`
  }
}

// determine the normalization needed for the children array.
// 0: no normalization needed
// 1: simple normalization needed (possible 1-level deep nested array) 孩子中有组件的
// 2: full normalization needed 孩子中有v-for或者tag是template或者tag是slot的
function getNormalizationType(
  children: Array<ASTNode>,
  maybeComponent: (el: ASTElement) => boolean
): number {
  let res = 0
  for (let i = 0; i < children.length; i++) {
    const el: ASTNode = children[i]
    if (el.type !== 1) {
      continue
    }
    if (needsNormalization(el) ||
      (el.ifConditions && el.ifConditions.some(c => needsNormalization(c.block)))) {
      res = 2
      break
    }
    if (maybeComponent(el) ||
      (el.ifConditions && el.ifConditions.some(c => maybeComponent(c.block)))) {
      res = 1
    }
  }
  return res
}

function needsNormalization(el: ASTElement): boolean {
  return el.for !== undefined || el.tag === 'template' || el.tag === 'slot'
}

function genNode(node: ASTNode, state: CodegenState): string {
  if (node.type === 1) {
    return genElement(node, state)
  } else if (node.type === 3 && node.isComment) {
    return genComment(node)
  } else {
    return genText(node)
  }
}

export function genText(text: ASTText | ASTExpression): string {
  return `_v(${text.type === 2
    ? text.expression // no need for () because already wrapped in _s()
    : transformSpecialNewlines(JSON.stringify(text.text))
    })`
}

export function genComment(comment: ASTText): string {
  return `_e(${JSON.stringify(comment.text)})`
}

function genSlot(el: ASTElement, state: CodegenState): string {
  const slotName = el.slotName || '"default"'
  const children = genChildren(el, state)
  let res = `_t(${slotName}${children ? `,${children}` : ''}`
  const attrs = el.attrs && `{${el.attrs.map(a => `${camelize(a.name)}:${a.value}`).join(',')}}`
  const bind = el.attrsMap['v-bind']
  if ((attrs || bind) && !children) {
    res += `,null`
  }
  if (attrs) {
    res += `,${attrs}`
  }
  if (bind) {
    res += `${attrs ? '' : ',null'},${bind}`
  }
  return res + ')'
}

// componentName is el.component, take it as argument to shun flow's pessimistic refinement
function genComponent(
  componentName: string,
  el: ASTElement,
  state: CodegenState
): string {
  const children = el.inlineTemplate ? null : genChildren(el, state, true)
  return `_c(${componentName},${genData(el, state)}${
    children ? `,${children}` : ''
    })`
}

function genProps(props: Array<{ name: string, value: any }>): string {
  let res = ''
  for (let i = 0; i < props.length; i++) {
    const prop = props[i]
    /* istanbul ignore if */
    if (__WEEX__) {
      res += `"${prop.name}":${generateValue(prop.value)},`
    } else {
      res += `"${prop.name}":${transformSpecialNewlines(prop.value)},`
    }
  }
  return res.slice(0, -1)
}

/* istanbul ignore next */
function generateValue(value) {
  if (typeof value === 'string') {
    return transformSpecialNewlines(value)
  }
  return JSON.stringify(value)
}

// #3895, #4268
function transformSpecialNewlines(text: string): string {
  return text
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
