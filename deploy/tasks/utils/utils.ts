import { BigNumber } from 'ethers'

export function getFirst<T>(tokenA: string, tokenB: string, a: T, b: T) {
  return BigNumber.from(tokenA).lt(tokenB) ? a : b
}

export function getSecond<T>(tokenA: string, tokenB: string, a: T, b: T) {
  return BigNumber.from(tokenA).lt(tokenB) ? b : a
}

export function isAddressEqual(address0: string, address1: string) {
  return address0.toLowerCase() === address1.toLowerCase()
}

export function trimToDecimals(value: string, decimalsNumber: number) {
  const [integer, decimals] = value.split('.')
  return decimals ? [integer, decimals.slice(0, decimalsNumber)].join('.') : integer
}

const NUMBER_REGEX = /^\d*(\.\d*)?$/

export function bigNumberFromString(decimals: number, value: string) {
  if (!NUMBER_REGEX.test(value)) {
    throw new Error('Invalid value provided')
  }
  let [integer = '', decimal = ''] = value.split('.')
  if (integer === '') {
    integer = '0'
  }
  if (decimal.length < decimals) {
    decimal = decimal.padEnd(decimals, '0')
  } else if (decimal.length > decimals) {
    decimal = decimal.substring(0, decimals)
  }
  return BigNumber.from(integer.concat(decimal))
}

export function sqrt(y: BigNumber): BigNumber {
  let z = y
  if (y.gt(3)) {
    let x = y.div(2).add(1)
    while (x.lt(z)) {
      z = x
      x = y.div(x).add(x).div(2)
    }
  } else if (!y.eq(0)) {
    z = BigNumber.from(1)
  }
  return z
}

// UniswapV3 utils

export function getMinTick(tickSpacing: number) {
  return Math.ceil(-887272 / tickSpacing) * tickSpacing
}

export function getMaxTick(tickSpacing: number) {
  return Math.floor(887272 / tickSpacing) * tickSpacing
}
