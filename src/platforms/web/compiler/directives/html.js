/* @flow */

import { addProp } from 'compiler/helpers'
// 在生成render函数的data的directive选项时候调用，其实也是语法糖啦，v-html相当于是给元素的innerHTML绑定state
export default function html(el: ASTElement, dir: ASTDirective) {
  if (dir.value) {
    addProp(el, 'innerHTML', `_s(${dir.value})`)
  }
}
