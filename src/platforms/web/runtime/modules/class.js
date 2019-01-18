/* @flow */
/**
 * 更新web平台元素class的方式
 */
import {
  isDef,
  isUndef
} from 'shared/util'

import {
  concat,
  stringifyClass,
  genClassForVnode
} from 'web/util/index'

function updateClass(oldVnode: any, vnode: any) {
  const el = vnode.elm
  const data: VNodeData = vnode.data
  const oldData: VNodeData = oldVnode.data
  //vnode上原来没有类名并且现在也没有
  if (
    isUndef(data.staticClass) &&
    isUndef(data.class) && (
      isUndef(oldData) || (
        isUndef(oldData.staticClass) &&
        isUndef(oldData.class)
      )
    )
  ) {
    return
  }
  /**
   * 生成当前vnode的class，包含父子组件,如：
    <CompsA :class="{classA:true}">
      <CompsB :class="{classB:true}">
        <CompsC :class="{classC:true}"></CompsC>
      </CompsB>
    </CompsA>
    假设当前vnode是CompsB，那么genClassForVnode，会得到"classA classB classC"
  */
  let cls = genClassForVnode(vnode)

  // handle transition classes
  const transitionClass = el._transitionClasses
  if (isDef(transitionClass)) {
    cls = concat(cls, stringifyClass(transitionClass))
  }

  // set the class
  if (cls !== el._prevClass) {
    el.setAttribute('class', cls)
    el._prevClass = cls
  }
}

export default {
  create: updateClass,
  update: updateClass
}
