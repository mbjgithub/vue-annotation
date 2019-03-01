/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
// 可以定制编译时候用到的解析器，优化器和代码生成器
export const createCompiler = createCompilerCreator(function baseCompile(
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 将模板转化为ast树
  const ast = parse(template.trim(), options)
  // 默认优化ast树，为后面生成staticRender做准备
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  const code = generate(ast, options)   //生成渲染函数
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
