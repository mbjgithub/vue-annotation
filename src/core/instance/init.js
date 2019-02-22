/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin(Vue: Class<Component>) {
  /**
   * 初始化函数，Vue构造函数里面就是调用这个方法
   * options:new Vue时候传入的options或者自定义组件由Vue传入的对象
   * {
   *  parent: Vue {_uid: 0, _isVue: true, $options: {…}, _renderProxy: Proxy, _self: Vue, …},
   *  _isComponent: true,
   *  _parentVnode: VNode {tag: "vue-component-1-TestComp", data: {…}, children: undefined, text: undefined, elm: undefined, …},
   *  __proto__: Object
   * }
   */
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++    //每个组件实例都有个编号

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    //避免组件实例被观察
    vm._isVue = true
    // merge options
    //这里通过mergeOptions生成的$options跟传入的options相比，有了很大变动
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 将Vue传入的options与自定义组件时传入的options合并，不过这里是手动合并，优化extend合并慢的缺点
      // 得到vm.$options
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    console.log('vm.$options', vm.$options)
    /* istanbul ignore else */
    //非生产环境下用es6的Proxy代理vm，便于访问vm的非法属性时做出提示
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm)          //在实例上挂在很多初始属性，并且链上父组件和子组件的关系，如vm.$parent，vm.$children
    initEvents(vm)             //实现自定义组件的自定义事件监听，<TestComps @click="onClick"></TestComps>，实现原理其实就是在创建TestComps实例的时候，在实例上监听click事件
    initRender(vm)             //创建当前上下文的createElement
    callHook(vm, 'beforeCreate')       //属性不具备响应式能力
    initInjections(vm) // resolve injections before data/props，provide 和 inject 主要为高阶插件/组件库提供用例。并不推荐直接用于应用程序代码中。
    initState(vm)      //初始化状态，props，methods，computed，data，watch，并加上Observe，做一些合法性校验
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')    //所以调用created回调的时候属性已经是响应式的了

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent(vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)   // opts是自定义组件传入的options
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode  //自定义组件vnode
  opts.parent = options.parent   //自定义组件所在的父组件实例
  opts._parentVnode = parentVnode

  // componentOptions
  // {
  //   Ctor: ƒ VueComponent(options)
  //   children: undefined
  //   listeners: undefined
  //   propsData: {person: {…}, password: "123456", username: "aliarmo"}
  //   tag: "TestComp"
  // }
  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions(Ctor: Class<Component>) {
  let options = Ctor.options  //定义组件时候传入的options，自定义组件都有一个单独的继承自Vue的构造函数
  if (Ctor.super) {  //父类
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {   //啥case情况下会不相等？todo
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions(Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const extended = Ctor.extendOptions
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = dedupe(latest[key], extended[key], sealed[key])
    }
  }
  return modified
}

function dedupe(latest, extended, sealed) {
  // compare latest and sealed to ensure lifecycle hooks won't be duplicated
  // between merges
  if (Array.isArray(latest)) {
    const res = []
    sealed = Array.isArray(sealed) ? sealed : [sealed]
    extended = Array.isArray(extended) ? extended : [extended]
    for (let i = 0; i < latest.length; i++) {
      // push original options and not sealed options to exclude duplicated options
      if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
        res.push(latest[i])
      }
    }
    return res
  } else {
    return latest
  }
}
