/* @flow */
/**
 * 处理el的directives的时候调用
 * wrapListeners，wrapData 处理完渲染函数的data参数后调用
 */
import on from './on'
import bind from './bind'
import { noop } from 'shared/util'

export default {
  on,
  bind,
  cloak: noop
}
