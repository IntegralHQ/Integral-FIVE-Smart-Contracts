import { IERC20 } from '../../../build/types'

export function getOrderedTokens(x: IERC20, y: IERC20) {
  const ordered = x.address.toLowerCase() < y.address.toLowerCase()
  return ordered ? [x, y] : [y, x]
}
