/* @flow */
/**
 * 为web平台制定的模板编译函数,TODO
 */
import { baseOptions } from './options'
import { createCompiler } from 'compiler/index'

const { compile, compileToFunctions } = createCompiler(baseOptions)

export { compile, compileToFunctions }
