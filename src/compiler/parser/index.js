/* @flow */

import he from 'he'
import { parseHTML } from './html-parser'
import { parseText } from './text-parser'
import { parseFilters } from './filter-parser'
import { genAssignmentCode } from '../directives/model'
import { extend, cached, no, camelize } from 'shared/util'
import { isIE, isEdge, isServerRendering } from 'core/util/env'

import {
  addProp,
  addAttr,
  baseWarn,
  addHandler,
  addDirective,
  getBindingAttr,
  getAndRemoveAttr,
  pluckModuleFunction
} from '../helpers'

export const onRE = /^@|^v-on:/
export const dirRE = /^v-|^@|^:/
export const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
export const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
const stripParensRE = /^\(|\)$/g

const argRE = /:(.*)$/
export const bindRE = /^:|^v-bind:/
const modifierRE = /\.[^.]+/g

const decodeHTMLCached = cached(he.decode)

// configurable state
export let warn: any
let delimiters
let transforms
let preTransforms
let postTransforms
let platformIsPreTag
let platformMustUseProp
let platformGetTagNamespace

type Attr = { name: string; value: string };
/**
 * ASTElement中含有的关键属性
 * directives:[{ name, rawName, value, arg, modifiers }]  除了v-bind，v-on之外，其他的指令如v-model，v-html，或是自定义指令都在这个directives里面
 * plain：没有属性没有key，则是plain元素
 * parent：父元素
 * children：孩子元素，不包含v-elseif，v-else所对应元素
 * ifConditions里面含有v-if，v-elseif，v-else所对应元素：[<t1 v-if />,<t2 v-elseif />,<t3 v-else />]
 */
export function createASTElement(
  tag: string,
  attrs: Array<Attr>,
  parent: ASTElement | void
): ASTElement {
  return {
    type: 1,
    tag,
    attrsList: attrs,
    attrsMap: makeAttrsMap(attrs),
    parent,
    children: []
  }
}

/**
 * Convert HTML string to AST.
 * 将template转化为ast，其中
 * 解析出部分模板后，<div class="className" style="width:100px"></div> 可定制调用preTransformNode，transformNode
 * 解析出结束元素的时候调用，</test> 可定制调用postTransformNode
 * 目的是在ast 元素上挂载符合平台要求的属性
 */
export function parse(
  template: string,
  options: CompilerOptions
): ASTElement | void {
  warn = options.warn || baseWarn

  platformIsPreTag = options.isPreTag || no
  platformMustUseProp = options.mustUseProp || no
  platformGetTagNamespace = options.getTagNamespace || no

  // 执行由平台传入的transformNode，比如web
  // 处理了class，style，其实就是获取class，然后在el上挂载el.staticClass=class
  transforms = pluckModuleFunction(options.modules, 'transformNode')
  // 解析出部分模板后，<div class="className" style="width:100px"></div>
  preTransforms = pluckModuleFunction(options.modules, 'preTransformNode')
  // 解析出结束元素的时候调用，</test>
  postTransforms = pluckModuleFunction(options.modules, 'postTransformNode')

  delimiters = options.delimiters

  const stack = []
  const preserveWhitespace = options.preserveWhitespace !== false
  let root
  let currentParent    //当前解析出来的ast element
  let inVPre = false   //是否是v-pre指令
  let inPre = false    //是否是pre标签
  let warned = false

  function warnOnce(msg) {
    if (!warned) {
      warned = true
      warn(msg)
    }
  }

  function closeElement(element) {
    // check pre state
    if (element.pre) {
      inVPre = false
    }
    if (platformIsPreTag(element.tag)) {
      inPre = false
    }
    // apply post-transforms
    for (let i = 0; i < postTransforms.length; i++) {
      postTransforms[i](element, options)
    }
  }

  parseHTML(template, {
    warn,
    expectHTML: options.expectHTML,
    isUnaryTag: options.isUnaryTag,
    canBeLeftOpenTag: options.canBeLeftOpenTag,
    shouldDecodeNewlines: options.shouldDecodeNewlines,
    shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
    shouldKeepComment: options.comments,
    /**
     * 解析出部分模板后调用，<div class="className" style="width:100px">
     * @param {标签名} tag
     * @param {属性列表[{name:'class',value:'className'},{id:'idName'}]} attrs
     * @param {是否为自闭合标签，true表示是} unary
     */
    // match.start解析的开始位置, match.end解析的结束位置
    // options.start(tagName, attrs, unary, match.start, match.end)
    start(tag, attrs, unary) {
      // check namespace.
      // inherit parent ns if there is one
      const ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag)

      // handle IE svg bug
      /* istanbul ignore if */
      if (isIE && ns === 'svg') {
        attrs = guardIESVGBug(attrs)
      }

      // {
      //   type: 1,
      //   tag,
      //   attrsList: attrs,
      //   attrsMap: makeAttrsMap(attrs),
      //   parent,
      //   children: []
      // }
      let element: ASTElement = createASTElement(tag, attrs, currentParent)
      if (ns) {
        element.ns = ns
      }

      if (isForbiddenTag(element) && !isServerRendering()) {
        element.forbidden = true
        process.env.NODE_ENV !== 'production' && warn(
          'Templates should only be responsible for mapping the state to the ' +
          'UI. Avoid placing tags with side-effects in your templates, such as ' +
          `<${tag}>` + ', as they will not be parsed.'
        )
      }

      // apply pre-transforms
      //解析出部分模板后，<div class="className" style="width:100px">
      // 调用平台传入的preTransform
      // web平台的v-model有定义，TODO
      for (let i = 0; i < preTransforms.length; i++) {
        element = preTransforms[i](element, options) || element
      }

      if (!inVPre) {
        // 处理v-pre属性
        processPre(element)
        // 是否为pre标签
        if (element.pre) {
          inVPre = true
        }
      }
      if (platformIsPreTag(element.tag)) {
        inPre = true
      }
      // 如果是pre标签
      if (inVPre) {
        processRawAttrs(element)
      } else if (!element.processed) {
        // structural directives
        processFor(element)
        processIf(element)
        processOnce(element)
        // element-scope stuff
        processElement(element, options)
      }
      // 检测root元素的合法性
      function checkRootConstraints(el) {
        if (process.env.NODE_ENV !== 'production') {
          if (el.tag === 'slot' || el.tag === 'template') {
            warnOnce(
              `Cannot use <${el.tag}> as component root element because it may ` +
              'contain multiple nodes.'
            )
          }
          if (el.attrsMap.hasOwnProperty('v-for')) {
            warnOnce(
              'Cannot use v-for on stateful component root element because ' +
              'it renders multiple elements.'
            )
          }
        }
      }

      // tree management
      if (!root) {
        root = element
        checkRootConstraints(root)
      } else if (!stack.length) {
        // allow root elements with v-if, v-else-if and v-else
        // 这样的case是模板有多个root element并且root element上有v-if，或者v-else
        if (root.if && (element.elseif || element.else)) {
          checkRootConstraints(element)
          addIfCondition(root, {
            exp: element.elseif,
            block: element
          })
        } else if (process.env.NODE_ENV !== 'production') {
          warnOnce(
            `Component template should contain exactly one root element. ` +
            `If you are using v-if on multiple elements, ` +
            `use v-else-if to chain them instead.`
          )
        }
      }
      if (currentParent && !element.forbidden) {
        if (element.elseif || element.else) {
          processIfConditions(element, currentParent)
        } else if (element.slotScope) { // scoped slot
          currentParent.plain = false
          const name = element.slotTarget || '"default"'
            ; (currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = element
        } else {
          currentParent.children.push(element)
          element.parent = currentParent
        }
      }
      // 非自闭合元素
      if (!unary) {
        currentParent = element
        stack.push(element)
      } else {
        closeElement(element)
      }
    },
    /**
     * 解析出</test>后调用
     */
    end() {
      // remove trailing whitespace
      const element = stack[stack.length - 1]
      const lastNode = element.children[element.children.length - 1]
      if (lastNode && lastNode.type === 3 && lastNode.text === ' ' && !inPre) {
        element.children.pop()
      }
      // pop stack
      stack.length -= 1
      currentParent = stack[stack.length - 1]
      closeElement(element)
    },
    /**
     * 解析出文本或者插值文本吼调用
     */
    chars(text: string) {
      if (!currentParent) {
        if (process.env.NODE_ENV !== 'production') {
          if (text === template) {
            warnOnce(
              'Component template requires a root element, rather than just text.'
            )
          } else if ((text = text.trim())) {
            warnOnce(
              `text "${text}" outside root element will be ignored.`
            )
          }
        }
        return
      }
      // IE textarea placeholder bug
      /* istanbul ignore if */
      if (isIE &&
        currentParent.tag === 'textarea' &&
        currentParent.attrsMap.placeholder === text
      ) {
        return
      }
      const children = currentParent.children
      // TODO
      text = inPre || text.trim()
        ? isTextTag(currentParent) ? text : decodeHTMLCached(text)
        // only preserve whitespace if its not right after a starting tag
        : preserveWhitespace && children.length ? ' ' : ''
      if (text) {
        let res
        if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
          // 有插值{{username}}
          children.push({
            type: 2,
            expression: res.expression,
            tokens: res.tokens,
            text
          })
        } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
          // 纯文本
          children.push({
            type: 3,
            text
          })
        }
      }
    },
    comment(text: string) {
      currentParent.children.push({
        type: 3,
        text,
        isComment: true
      })
    }
  })
  return root
}

function processPre(el) {
  if (getAndRemoveAttr(el, 'v-pre') != null) {
    el.pre = true
  }
}

function processRawAttrs(el) {
  const l = el.attrsList.length
  if (l) {
    const attrs = el.attrs = new Array(l)
    for (let i = 0; i < l; i++) {
      attrs[i] = {
        name: el.attrsList[i].name,
        value: JSON.stringify(el.attrsList[i].value)
      }
    }
  } else if (!el.pre) {
    // non root node in pre blocks with no attributes
    el.plain = true
  }
}
/**
 * 处理放在元素上的特殊特性 key，ref，is，slot，slot-scope
 * 处理平台要求特殊处理的属性，如web平台要求特殊处理class，style
 * 处理指令 v-bind,v-on,自定义指令
 * 处理静态属性 如果：id="app"
 * @param {*} element
 * @param {*} options
 */
export function processElement(element: ASTElement, options: CompilerOptions) {
  // 处理key <div key="testKey">
  processKey(element)

  // determine whether this is a plain element after
  // removing structural attributes
  // 没有属性没有key，则是plain元素
  element.plain = !element.key && !element.attrsList.length

  processRef(element)
  processSlot(element)
  processComponent(element)
  // 执行由平台传入的transformNode，比如web
  // 处理了class，style，其实就是获取class，然后在el上挂载el.staticClass=class
  for (let i = 0; i < transforms.length; i++) {
    element = transforms[i](element, options) || element
  }
  // 处理剩余的静态属性和动态的数据绑定
  processAttrs(element)
}

function processKey(el) {
  const exp = getBindingAttr(el, 'key')
  if (exp) {
    if (process.env.NODE_ENV !== 'production' && el.tag === 'template') {
      warn(`<template> cannot be keyed. Place the key on real elements instead.`)
    }
    el.key = exp
  }
}

function processRef(el) {
  const ref = getBindingAttr(el, 'ref')
  if (ref) {
    el.ref = ref
    el.refInFor = checkInFor(el)  // 当前元素或者其祖先元素是否有v-for
  }
}

// 编译v-for
export function processFor(el: ASTElement) {
  let exp
  if ((exp = getAndRemoveAttr(el, 'v-for'))) {
    // v-for="(item,index) in items"
    const res = parseFor(exp)  // 解析表达式
    if (res) {
      extend(el, res)
    } else if (process.env.NODE_ENV !== 'production') {
      warn(
        `Invalid v-for expression: ${exp}`
      )
    }
  }
}
// v-for="(item,index) in items"
type ForParseResult = {
  for: string;         // items名字
  alias: string;       // item
  iterator1?: string;  // index或者key
  iterator2?: string;   // 如果是对象的话，这个值就是遍历的第几个key
};

export function parseFor(exp: string): ?ForParseResult {
  // matched[1] (item,index)或者item
  // matched[2] items
  const inMatch = exp.match(forAliasRE)
  if (!inMatch) return
  const res = {}
  res.for = inMatch[2].trim()  //获取items名字
  const alias = inMatch[1].trim().replace(stripParensRE, '')  //如果有括号，去掉括号
  const iteratorMatch = alias.match(forIteratorRE)
  if (iteratorMatch) {
    res.alias = alias.replace(forIteratorRE, '').trim()   // 获取item名字
    res.iterator1 = iteratorMatch[1].trim()  // 获取index名字
    if (iteratorMatch[2]) {
      res.iterator2 = iteratorMatch[2].trim() // 获取index后面名字
    }
  } else {
    res.alias = alias
  }
  return res
}
// 编译v-if，v-else-if，v-else
function processIf(el) {
  const exp = getAndRemoveAttr(el, 'v-if')
  if (exp) {
    el.if = exp
    // 添加if的condition到el上
    addIfCondition(el, {
      exp: exp,
      block: el
    })
  } else {
    if (getAndRemoveAttr(el, 'v-else') != null) {
      el.else = true
    }
    const elseif = getAndRemoveAttr(el, 'v-else-if')
    if (elseif) {
      el.elseif = elseif
    }
  }
}

function processIfConditions(el, parent) {
  const prev = findPrevElement(parent.children)
  if (prev && prev.if) {
    addIfCondition(prev, {
      exp: el.elseif,
      block: el
    })
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `v-${el.elseif ? ('else-if="' + el.elseif + '"') : 'else'} ` +
      `used on element <${el.tag}> without corresponding v-if.`
    )
  }
}

function findPrevElement(children: Array<any>): ASTElement | void {
  let i = children.length
  while (i--) {
    if (children[i].type === 1) {
      return children[i]
    } else {
      if (process.env.NODE_ENV !== 'production' && children[i].text !== ' ') {
        warn(
          `text "${children[i].text.trim()}" between v-if and v-else(-if) ` +
          `will be ignored.`
        )
      }
      children.pop()
    }
  }
}
/**
 *
 * ifConditions里面含有v-if，v-elseif，v-else所对应元素：[<t1 v-if />,<t2 v-elseif />,<t3 v-else />]
 * @param {*} el
 * @param {*} condition
 */
export function addIfCondition(el: ASTElement, condition: ASTIfCondition) {
  if (!el.ifConditions) {
    el.ifConditions = []
  }
  el.ifConditions.push(condition)
}
// 编译v-once
function processOnce(el) {
  const once = getAndRemoveAttr(el, 'v-once')
  if (once != null) {
    el.once = true
  }
}
// TODO slot
function processSlot(el) {
  if (el.tag === 'slot') {
    el.slotName = getBindingAttr(el, 'name')
    if (process.env.NODE_ENV !== 'production' && el.key) {
      warn(
        `\`key\` does not work on <slot> because slots are abstract outlets ` +
        `and can possibly expand into multiple elements. ` +
        `Use the key on a wrapping element instead.`
      )
    }
  } else {
    let slotScope
    if (el.tag === 'template') {
      slotScope = getAndRemoveAttr(el, 'scope')
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && slotScope) {
        warn(
          `the "scope" attribute for scoped slots have been deprecated and ` +
          `replaced by "slot-scope" since 2.5. The new "slot-scope" attribute ` +
          `can also be used on plain elements in addition to <template> to ` +
          `denote scoped slots.`,
          true
        )
      }
      el.slotScope = slotScope || getAndRemoveAttr(el, 'slot-scope')
    } else if ((slotScope = getAndRemoveAttr(el, 'slot-scope'))) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && el.attrsMap['v-for']) {
        warn(
          `Ambiguous combined usage of slot-scope and v-for on <${el.tag}> ` +
          `(v-for takes higher priority). Use a wrapper <template> for the ` +
          `scoped slot to make it clearer.`,
          true
        )
      }
      el.slotScope = slotScope
    }
    const slotTarget = getBindingAttr(el, 'slot')
    if (slotTarget) {
      el.slotTarget = slotTarget === '""' ? '"default"' : slotTarget
      // preserve slot as an attribute for native shadow DOM compat
      // only for non-scoped slots.
      if (el.tag !== 'template' && !el.slotScope) {
        addAttr(el, 'slot', slotTarget)
      }
    }
  }
}

// 处理<component :is="testComps" />
function processComponent(el) {
  let binding
  if ((binding = getBindingAttr(el, 'is'))) {
    el.component = binding
  }
  if (getAndRemoveAttr(el, 'inline-template') != null) {
    el.inlineTemplate = true
  }
}
/**
 * 处理动态绑定的属性：:username="username | filter", @click="onClick"，v-permission="value"
 * 处理静态属性：id="app" data-index="index"
 * @param {*} el
 */
function processAttrs(el) {
  const list = el.attrsList  // 前面已经处理过的attrs已经被移除过的了
  let i, l, name, rawName, value, modifiers, isProp
  for (i = 0, l = list.length; i < l; i++) {
    name = rawName = list[i].name
    value = list[i].value
    if (dirRE.test(name)) {     // 动态绑定的属性@,v-,:
      // mark element as dynamic
      el.hasBindings = true
      // modifiers
      modifiers = parseModifiers(name)  // 解析出修饰符
      if (modifiers) {
        name = name.replace(modifierRE, '')  //移除修饰符
      }
      if (bindRE.test(name)) { // v-bind
        name = name.replace(bindRE, '')
        value = parseFilters(value)  // 解析出filter
        isProp = false
        if (
          process.env.NODE_ENV !== 'production' &&
          value.trim().length === 0
        ) {
          warn(
            `The value for a v-bind expression cannot be empty. Found in "v-bind:${name}"`
          )
        }
        if (modifiers) {
          // 通过 prop 修饰符绑定 DOM 属性
          if (modifiers.prop) {
            isProp = true   // 有prop修饰符
            name = camelize(name)
            if (name === 'innerHtml') name = 'innerHTML'
          }
          // 通过 camel 修饰符对绑定的属性进行驼峰命名
          if (modifiers.camel) {
            name = camelize(name)
          }
          // sync修饰符是prop 进行“双向绑定”的语法糖
          if (modifiers.sync) {
            addHandler(
              el,
              `update:${camelize(name)}`,  //事件名
              genAssignmentCode(value, `$event`)  //TODO，事件处理函数
            )
          }
        }
        if (isProp || (
          !el.component && platformMustUseProp(el.tag, el.attrsMap.type, name)
        )) {
          addProp(el, name, value)  // :value="val"或者:innerHtml.prop="啦啦啦啦"
        } else {
          addAttr(el, name, value) // :username="username"
        }
      } else if (onRE.test(name)) { // v-on
        name = name.replace(onRE, '')
        addHandler(el, name, value, modifiers, false, warn)   //处理事件
      } else { // normal directives，注意到只有normal directives传入的param才有效
        name = name.replace(dirRE, '')      // v-permission.foo.bar:param="value"
        // parse arg
        const argMatch = name.match(argRE)
        const arg = argMatch && argMatch[1] //获取到传给指令的参数
        if (arg) {
          name = name.slice(0, -(arg.length + 1))  // 获取指令名称
        }
        addDirective(el, name, rawName, value, arg, modifiers)   //添加解析出来的指令
        if (process.env.NODE_ENV !== 'production' && name === 'model') {
          checkForAliasModel(el, value)
        }
      }
    } else {
      // literal attribute
      // 静态属性
      if (process.env.NODE_ENV !== 'production') {
        const res = parseText(value, delimiters)
        if (res) {
          warn(
            `${name}="${value}": ` +
            'Interpolation inside attributes has been removed. ' +
            'Use v-bind or the colon shorthand instead. For example, ' +
            'instead of <div id="{{ val }}">, use <div :id="val">.'
          )
        }
      }
      addAttr(el, name, JSON.stringify(value))
      // #6887 firefox doesn't update muted state if set via attribute
      // even immediately after element creation
      if (!el.component &&
        name === 'muted' &&
        platformMustUseProp(el.tag, el.attrsMap.type, name)) {
        addProp(el, name, 'true')
      }
    }
  }
}
/**
 * 找当前el及其parent中是否有v-for
 * @param {*} el
 */
function checkInFor(el: ASTElement): boolean {
  let parent = el
  while (parent) {
    if (parent.for !== undefined) {
      return true
    }
    parent = parent.parent
  }
  return false
}

function parseModifiers(name: string): Object | void {
  const match = name.match(modifierRE)
  if (match) {
    const ret = {}
    match.forEach(m => { ret[m.slice(1)] = true })
    return ret
  }
}

function makeAttrsMap(attrs: Array<Object>): Object {
  const map = {}
  for (let i = 0, l = attrs.length; i < l; i++) {
    if (
      process.env.NODE_ENV !== 'production' &&
      map[attrs[i].name] && !isIE && !isEdge
    ) {
      warn('duplicate attribute: ' + attrs[i].name)
    }
    map[attrs[i].name] = attrs[i].value
  }
  return map
}

// for script (e.g. type="x/template") or style, do not decode content
function isTextTag(el): boolean {
  return el.tag === 'script' || el.tag === 'style'
}

function isForbiddenTag(el): boolean {
  return (
    el.tag === 'style' ||
    (el.tag === 'script' && (
      !el.attrsMap.type ||
      el.attrsMap.type === 'text/javascript'
    ))
  )
}

const ieNSBug = /^xmlns:NS\d+/
const ieNSPrefix = /^NS\d+:/

/* istanbul ignore next */
function guardIESVGBug(attrs) {
  const res = []
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i]
    if (!ieNSBug.test(attr.name)) {
      attr.name = attr.name.replace(ieNSPrefix, '')
      res.push(attr)
    }
  }
  return res
}

function checkForAliasModel(el, value) {
  let _el = el
  while (_el) {
    if (_el.for && _el.alias === value) {
      warn(
        `<${el.tag} v-model="${value}">: ` +
        `You are binding v-model directly to a v-for iteration alias. ` +
        `This will not be able to modify the v-for source array because ` +
        `writing to the alias is like modifying a function local variable. ` +
        `Consider using an array of objects and use v-model on an object property instead.`
      )
    }
    _el = _el.parent
  }
}
