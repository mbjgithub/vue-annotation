/**
 * 解析出部分模板后对class，style，model的特殊处理，<div class="className" style="width:100px">
 * 处理的结果是在ast上挂载属性，分为三个钩子：
 *
 * preTransformNode：编译生成ast树后立即调用
 * transformNode：规范化ast属性的过程中调用
 * postTransformNode：解析出</div>后调用
 *
 * transformCode：odegen的过程中生成code后调用
 * genData：codegen的过程中调用
 * 这个module的定义与具体平台相关
 */

import klass from './class'
import style from './style'
import model from './model'

export default [
  klass,
  style,
  model
]
