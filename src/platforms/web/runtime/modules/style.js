/* @flow */
/**
 * 给web平台元素更新样式
 */
import { getStyle, normalizeStyleBinding } from 'web/util/style'
import { cached, camelize, extend, isDef, isUndef } from 'shared/util'

const cssVarRE = /^--/
const importantRE = /\s*!important$/

/**
 * 设置元素样式
 */
const setProp = (el, name, val) => {
  /* istanbul ignore if */
  if (cssVarRE.test(name)) {
    el.style.setProperty(name, val)
  } else if (importantRE.test(val)) {
    el.style.setProperty(name, val.replace(importantRE, ''), 'important')
  } else {
    const normalizedName = normalize(name)
    if (Array.isArray(val)) {
      // Support values array created by autoprefixer, e.g.
      // {display: ["-webkit-box", "-ms-flexbox", "flex"]}
      // Set them one by one, and the browser will only set those it can recognize
      for (let i = 0, len = val.length; i < len; i++) {
        el.style[normalizedName] = val[i]
      }
    } else {
      el.style[normalizedName] = val
    }
  }
}

const vendorNames = ['Webkit', 'Moz', 'ms']

let emptyStyle
//样式名称标准化
const normalize = cached(function (prop) {
  emptyStyle = emptyStyle || document.createElement('div').style
  prop = camelize(prop)
  if (prop !== 'filter' && (prop in emptyStyle)) {
    return prop
  }
  const capName = prop.charAt(0).toUpperCase() + prop.slice(1)
  for (let i = 0; i < vendorNames.length; i++) {
    const name = vendorNames[i] + capName
    if (name in emptyStyle) {
      return name
    }
  }
})

function updateStyle(oldVnode: VNodeWithData, vnode: VNodeWithData) {
  const data = vnode.data
  const oldData = oldVnode.data

  if (isUndef(data.staticStyle) && isUndef(data.style) &&
    isUndef(oldData.staticStyle) && isUndef(oldData.style)
  ) {
    return
  }

  let cur, name
  const el: any = vnode.elm
  const oldStaticStyle: any = oldData.staticStyle
  const oldStyleBinding: any = oldData.normalizedStyle || oldData.style || {}

  // if static style exists, stylebinding already merged into it when doing normalizeStyleData
  const oldStyle = oldStaticStyle || oldStyleBinding
  //传入的样式数据格式标准化
  const style = normalizeStyleBinding(vnode.data.style) || {}

  // store normalized style under a different key for next diff
  // make sure to clone it if it's reactive, since the user likely wants
  // to mutate it.
  vnode.data.normalizedStyle = isDef(style.__ob__)
    ? extend({}, style)
    : style

  const newStyle = getStyle(vnode, true)

  for (name in oldStyle) {
    if (isUndef(newStyle[name])) {
      setProp(el, name, '')
    }
  }
  for (name in newStyle) {
    cur = newStyle[name]
    if (cur !== oldStyle[name]) {
      // ie9 setting to null has no effect, must use empty string
      setProp(el, name, cur == null ? '' : cur)
    }
  }
}

export default {
  create: updateStyle,
  update: updateStyle
}
