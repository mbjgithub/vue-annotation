/* @flow */

import { addProp } from 'compiler/helpers'
// 在生成render函数的data的directive选项时候调用
export default function html(el: ASTElement, dir: ASTDirective) {
  if (dir.value) {
    addProp(el, 'innerHTML', `_s(${dir.value})`)
  }
}
