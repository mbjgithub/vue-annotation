/* @flow */

import Vue from 'core/index'
import config from 'core/config'      //挂在Vue上面的通用属性，用来控制日志什么的
import { extend, noop } from 'shared/util'
import { mountComponent } from 'core/instance/lifecycle'
import { devtools, inBrowser, isChrome } from 'core/util/index'

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch'
import platformDirectives from './directives/index'   //定义web平台的内置指令v-model，v-show
import platformComponents from './components/index'   //定义web平台的内置组件Transition，TransitionGroup

// install platform specific utils，这些全局方法本来就是vue core暴露给平台使用的
//web平台元素的某个属性必须要跟props绑定的，不能绑定一个常量，如input元素，就不能<input type='text' :value="'哈哈哈'">eb平台元素的某个属性必须要跟props绑定的，不能绑定一个常量，如input元素，就不能<input type='text' :value="'哈哈哈'">
Vue.config.mustUseProp = mustUseProp
//自定义组件不能跟web提供的元素重名，如div，span等
Vue.config.isReservedTag = isReservedTag
//自定义元素上不能定义的属性，style，class，TODO
Vue.config.isReservedAttr = isReservedAttr
// web平台，获取元素命名空间
Vue.config.getTagNamespace = getTagNamespace
// web平台不认识的元素
Vue.config.isUnknownElement = isUnknownElement

// install platform runtime directives & components
extend(Vue.options.directives, platformDirectives)
extend(Vue.options.components, platformComponents)

// install platform patch function
Vue.prototype.__patch__ = inBrowser ? patch : noop   //web平台操作element的方法，包括创建，修改，查找，删除，设置属性等

// public mount method
// 具体的平台需要定义一个自己的$mount方法给vue
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)     //挂载
}

// devtools global hook
/* istanbul ignore next */
if (inBrowser) {
  setTimeout(() => {
    if (config.devtools) {
      if (devtools) {
        devtools.emit('init', Vue)
      } else if (
        process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test' &&
        isChrome
      ) {
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
          'https://github.com/vuejs/vue-devtools'
        )
      }
    }
    if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      console[console.info ? 'info' : 'log'](
        `You are running Vue in development mode.\n` +
        `Make sure to turn on production mode when deploying for production.\n` +
        `See more tips at https://vuejs.org/guide/deployment.html`
      )
    }
  }, 0)
}

export default Vue
