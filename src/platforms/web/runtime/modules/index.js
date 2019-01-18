import attrs from './attrs'                //给vnode提供web平台元素的创建和更新方法
import klass from './class'                //更新class
import events from './events'               //绑定事件回调
import domProps from './dom-props'               //更新dom属性，innerText，innerHTML，value等
import style from './style'               //更新style
import transition from './transition'
/**
 * vnode更新时候逐步需要做的操作，都含有create和update操作函数
 */
export default [
  attrs,
  klass,
  events,
  domProps,
  style,
  transition
]
