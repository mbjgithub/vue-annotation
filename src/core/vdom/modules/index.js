/**
 * patch的baseModules
 */

import directives from './directives'     //vnode生命周期内调用定义指令时候提供的钩子函数
import ref from './ref'                   //获取组件(自定义)或者元素(视具体的平台而定)的引用

export default [
  ref,
  directives
]
