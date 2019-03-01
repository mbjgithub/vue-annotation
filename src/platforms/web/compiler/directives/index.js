/**
 * codegen时需要调用的钩子，用于生成特定平台的渲染函数，如v-html在某个元素上
 * 那么只需要关心这个元素props的innerHTML就好
 *
 * 与具体平台相关
 */
import model from './model'
import text from './text'
import html from './html'

export default {
  model,
  text,
  html
}
