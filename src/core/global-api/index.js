/* @flow */

//暴露给外界用户的全局配置，Vue.silent,Vue.productionTip
//暴露给平台的全局配置，Vue.mustUseProp,Vue.isUnknownElement
import config from '../config'
// Vue.use
import { initUse } from './use'
// Vue.mixin
import { initMixin } from './mixin'
// Vue.extend
import { initExtend } from './extend'
// Vue.component, Vue.directive, Vue.filter
import { initAssetRegisters } from './assets'
// Vue.set,Vue.delete
import { set, del } from '../observer/index'

import { ASSET_TYPES } from 'shared/constants'

// vue core内置组件
import builtInComponents from '../components/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI(Vue: GlobalAPI) {
  // config，定义全局配置Vue.config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }
  //给响应式对象添加响应式属性，并即刻触发UI更新
  Vue.set = set
  // 删除响应式属性，并即刻触发UI更新
  Vue.delete = del
  //加入到microtask或者macrotask
  Vue.nextTick = nextTick

  /**
   * 应用中用到的所有components directives filters
   */
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  // 标志是最开始那个vue构造函数
  Vue.options._base = Vue

  extend(Vue.options.components, builtInComponents)   //Vue 内置component，目前只有keep-alive

  initUse(Vue)         //定义Vue.use
  initMixin(Vue)       //定义Vue.mixin
  initExtend(Vue)      //定义Vue.extend
  initAssetRegisters(Vue)  //在Vue上面挂所有的filters，components，directives
}
