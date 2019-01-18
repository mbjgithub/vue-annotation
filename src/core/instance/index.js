import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

/**
 * Vue构造函数里面也是只有个_init，所以Vue.extend里面也只是单纯调用_init
 * @param {组件选项} options
 */
function Vue(options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}


//Vue的prototype上挂在方法，也就是给实例挂载方法
initMixin(Vue)        //实例上挂载_init函数，这个函数会在实例化的时候被调用，里面有生命周期函数beforeCreated,created,
stateMixin(Vue)       //实例上挂载$set,$delete,$watch
eventsMixin(Vue)      //实例上挂载$on,$off,$once,$emit
lifecycleMixin(Vue)   //实例上挂载_update,$forceUpdate,$destory
renderMixin(Vue)      //实例上挂载$nextTick,_render(原来render的最终结果是VNode)

export default Vue
