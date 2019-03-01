/* @flow */

import { toNumber, toString, looseEqual, looseIndexOf } from 'shared/util'
import { createTextVNode, createEmptyVNode } from 'core/vdom/vnode'
import { renderList } from './render-list'
import { renderSlot } from './render-slot'
import { resolveFilter } from './resolve-filter'
import { checkKeyCodes } from './check-keycodes'
import { bindObjectProps } from './bind-object-props'
import { renderStatic, markOnce } from './render-static'
import { bindObjectListeners } from './bind-object-listeners'
import { resolveScopedSlots } from './resolve-slots'
/**
 * 1、自定义组件如何把props传递给它的template的？
 * @param {Vue.prototype} target
 */
export function installRenderHelpers(target: any) {
  target._o = markOnce       // 处理v-once，用一个唯一key标记这个节点为静态节点
  target._n = toNumber       //转为整数
  target._s = toString        //转为字符串
  target._l = renderList      //转化v-for
  target._t = renderSlot
  target._q = looseEqual
  target._i = looseIndexOf
  target._m = renderStatic     // 渲染静态dom 结构，调用staticRenderFns
  target._f = resolveFilter    // 获取filter定义 :class="classStr | filter('hahaha')"    _f("filter")(classStr,'hahaha')
  target._k = checkKeyCodes    // 事件自定义的keycode
  target._b = bindObjectProps
  target._v = createTextVNode  // 创建文本vnode
  target._e = createEmptyVNode // 创建注释vnode
  target._u = resolveScopedSlots
  target._g = bindObjectListeners
}
