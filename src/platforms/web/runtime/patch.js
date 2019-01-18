/* @flow */
/**
 * web平台的元素操作方法
 */
import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index' //vue默认有的modules，包含ref和directives
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
// vnode更新时候，在元素上需要做的操作，如事件绑定、class和style更新策略、dom props操作等
const modules = platformModules.concat(baseModules)
/**
 * nodeOps 提供元素的增删改查
 * modules 为元素附加特性
 */
export const patch: Function = createPatchFunction({ nodeOps, modules })
