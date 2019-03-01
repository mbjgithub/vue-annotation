/* @flow */

import { identity, resolveAsset } from 'core/util/index'

/**
 * Runtime helper for resolving filters
 * id是过滤器的名称
 */
export function resolveFilter(id: string): Function {
  return resolveAsset(this.$options, 'filters', id, true) || identity
}
