/* @flow */

import {
  isPreTag,             //tag是否是pre
  mustUseProp,          //tag的某个属性必须要跟组件的状态绑定
  isReservedTag,        //自定义组件不能跟web提供的元素重名，如div，span等
  getTagNamespace      //获取元素的命名空间
} from '../util/index'

import modules from './modules/index'
import directives from './directives/index'
import { genStaticKeys } from 'shared/util'
import { isUnaryTag, canBeLeftOpenTag } from './util'

export const baseOptions: CompilerOptions = {
  expectHTML: true,
  modules,
  directives,
  isPreTag,
  isUnaryTag,
  mustUseProp,
  canBeLeftOpenTag,
  isReservedTag,
  getTagNamespace,
  staticKeys: genStaticKeys(modules)
}
