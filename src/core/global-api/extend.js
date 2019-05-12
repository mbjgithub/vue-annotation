/* @flow */
/**
 * 创造出一个继承自Vue的新类，官方：使用基础 Vue 构造器，创建一个“子类”
 * Vue.component里面调用的也是Vue.extend
 */
import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend(Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance,所以说如果用Vue.extend会创造出一个继承自Vue的新类
   * extendOptions是在定义Vue组件的时候传入的参数
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this
    const SuperId = Super.cid
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    // 如果构造函数有被缓存过
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }

    /**
     * @param {占位自定义组件提供的options} options
     * {
     * parent: 父组件实例,
     * _isComponent: true
     * _parentVnode:占位自定义组件vnode，用于传递一些props，event等事件
     * }
     */
    const Sub = function VueComponent(options) {
      console.log("placeholder component options", options)
      this._init(options)
    }
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    //当前options与全局options合并,并进行options的标准化
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    // 在vm上挂载props，vm.username访问的其实是prototype上的username，其实是访问的vm._props.username，
    // 后面在initProps的时候，会在vm上挂载_props，
    // _props上的属性是响应式的，因此，vm.username的访问路径是：
    // vm.username的get，get里面返回的就是vm._props.username，那就会访问vm._props.username的get，就会进行依赖收集
    // 还真是曲折呀，set是一样的
    if (Sub.options.props) {
      initProps(Sub)
    }
    //TODO
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    //浅复制
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

function initProps(Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed(Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
