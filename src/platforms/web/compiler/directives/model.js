/* @flow */
/**
 * v-model
 * state跟特定元素的属性绑定，更新state，则更新UI
 * 给元素添加事件，事件回调更新state
 */
import config from 'core/config'
import { addHandler, addProp, getBindingAttr } from 'compiler/helpers'
import { genComponentModel, genAssignmentCode } from 'compiler/directives/model'

let warn

// in some cases, the event used has to be determined at runtime
// so we used some reserved tokens during compile.
export const RANGE_TOKEN = '__r'
export const CHECKBOX_RADIO_TOKEN = '__c'
// v-model.trim="person.name"
export default function model(
  el: ASTElement,
  dir: ASTDirective,
  _warn: Function
): ?boolean {
  warn = _warn
  const value = dir.value  // person.name
  const modifiers = dir.modifiers  // {trim:true}
  const tag = el.tag   // v-model所在元素
  const type = el.attrsMap.type

  if (process.env.NODE_ENV !== 'production') {
    // inputs with type="file" are read only and setting the input's
    // value will throw an error.
    if (tag === 'input' && type === 'file') {
      warn(
        `<${el.tag} v-model="${value}" type="file">:\n` +
        `File inputs are read only. Use a v-on:change listener instead.`
      )
    }
  }
  // <component v-model="person.name" :is="TestComps"></component>
  // 由平台来决定如何处理component组件的v-model
  if (el.component) {
    genComponentModel(el, value, modifiers)           // 单独在el上挂载了一个model的配置，包含value和callback
    // component v-model doesn't need extra runtime
    return false
  } else if (tag === 'select') {
    genSelect(el, value, modifiers)   // 给select添加了change事件，回调所做的事情就是将被选中的options设置到绑定的state上
  } else if (tag === 'input' && type === 'checkbox') {
    genCheckboxModel(el, value, modifiers)
  } else if (tag === 'input' && type === 'radio') {
    genRadioModel(el, value, modifiers)
  } else if (tag === 'input' || tag === 'textarea') {
    genDefaultModel(el, value, modifiers)
  } else if (!config.isReservedTag(tag)) {
    genComponentModel(el, value, modifiers)  // 自定义组件上使用v-model，<TestComps v-model="person.name"></TestComps>
    // component v-model doesn't need extra runtime
    return false
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `<${el.tag} v-model="${value}">: ` +
      `v-model is not supported on this element type. ` +
      'If you are working with contenteditable, it\'s recommended to ' +
      'wrap a library dedicated for that purpose inside a custom component.'
    )
  }

  // ensure runtime directive metadata
  return true
}

function genCheckboxModel(
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
) {
  const number = modifiers && modifiers.number
  const valueBinding = getBindingAttr(el, 'value') || 'null'
  const trueValueBinding = getBindingAttr(el, 'true-value') || 'true'
  const falseValueBinding = getBindingAttr(el, 'false-value') || 'false'
  addProp(el, 'checked',
    `Array.isArray(${value})` +
    `?_i(${value},${valueBinding})>-1` + (
      trueValueBinding === 'true'
        ? `:(${value})`
        : `:_q(${value},${trueValueBinding})`
    )
  )
  addHandler(el, 'change',
    `var $$a=${value},` +
    '$$el=$event.target,' +
    `$$c=$$el.checked?(${trueValueBinding}):(${falseValueBinding});` +
    'if(Array.isArray($$a)){' +
    `var $$v=${number ? '_n(' + valueBinding + ')' : valueBinding},` +
    '$$i=_i($$a,$$v);' +
    `if($$el.checked){$$i<0&&(${genAssignmentCode(value, '$$a.concat([$$v])')})}` +
    `else{$$i>-1&&(${genAssignmentCode(value, '$$a.slice(0,$$i).concat($$a.slice($$i+1))')})}` +
    `}else{${genAssignmentCode(value, '$$c')}}`,
    null, true
  )
}

function genRadioModel(
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
) {
  const number = modifiers && modifiers.number
  let valueBinding = getBindingAttr(el, 'value') || 'null'     // 这里getBindingAttr的值不明白，还有:value="username"？，TODO
  valueBinding = number ? `_n(${valueBinding})` : valueBinding
  addProp(el, 'checked', `_q(${value},${valueBinding})`)
  addHandler(el, 'change', genAssignmentCode(value, valueBinding), null, true)
}
/**
 * 没有跟select的value绑定？TODO
 */
function genSelect(
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
) {
  const number = modifiers && modifiers.number
  const selectedVal = `Array.prototype.filter` +
    `.call($event.target.options,function(o){return o.selected})` +
    `.map(function(o){var val = "_value" in o ? o._value : o.value;` +
    `return ${number ? '_n(val)' : 'val'}})`

  const assignment = '$event.target.multiple ? $$selectedVal : $$selectedVal[0]'
  let code = `var $$selectedVal = ${selectedVal};`
  code = `${code} ${genAssignmentCode(value, assignment)}`
  addHandler(el, 'change', code, null, true)
}

function genDefaultModel(
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
): ?boolean {
  const type = el.attrsMap.type

  // warn if v-bind:value conflicts with v-model
  // except for inputs with v-bind:type
  if (process.env.NODE_ENV !== 'production') {
    const value = el.attrsMap['v-bind:value'] || el.attrsMap[':value']
    const typeBinding = el.attrsMap['v-bind:type'] || el.attrsMap[':type']
    if (value && !typeBinding) {
      const binding = el.attrsMap['v-bind:value'] ? 'v-bind:value' : ':value'
      warn(
        `${binding}="${value}" conflicts with v-model on the same element ` +
        'because the latter already expands to a value binding internally'
      )
    }
  }

  const { lazy, number, trim } = modifiers || {}
  const needCompositionGuard = !lazy && type !== 'range'
  const event = lazy
    ? 'change'
    : type === 'range'
      ? RANGE_TOKEN
      : 'input'

  let valueExpression = '$event.target.value'
  if (trim) {
    valueExpression = `$event.target.value.trim()`
  }
  if (number) {
    valueExpression = `_n(${valueExpression})`
  }

  let code = genAssignmentCode(value, valueExpression)
  if (needCompositionGuard) {
    code = `if($event.target.composing)return;${code}`
  }

  addProp(el, 'value', `(${value})`)
  addHandler(el, event, code, null, true)
  if (trim || number) {
    addHandler(el, 'blur', '$forceUpdate()')
  }
}
