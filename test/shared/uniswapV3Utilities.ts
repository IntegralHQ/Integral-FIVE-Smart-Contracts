import { BigNumber, constants } from 'ethers'
import { bigNumberFromString, sqrt } from '../../deploy/tasks/utils/utils'

const BN_2_160 = BigNumber.from(2).pow(160)
const BN_2_128 = BigNumber.from(2).pow(128)
export const BN_2_96 = BigNumber.from(2).pow(96)
const BN_2_32 = BigNumber.from(2).pow(32)

export enum FeeAmount {
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

const FEE_SIZE = 3

// copied from: https://github.com/Uniswap/uniswap-v3-periphery/blob/9ca9575d09b0b8d985cc4d9a0f689f7a4470ecb7/test/shared/path.ts
export function encodePath(path: string[], fees: FeeAmount[]): string {
  if (path.length != fees.length + 1) {
    throw new Error('path/fee lengths do not match')
  }

  let encoded = '0x'
  for (let i = 0; i < fees.length; i++) {
    // 20 byte encoding of the address
    encoded += path[i].slice(2)
    // 3 byte encoding of the fee
    encoded += fees[i].toString(16).padStart(2 * FEE_SIZE, '0')
  }
  // encode the final token
  encoded += path[path.length - 1].slice(2)

  return encoded.toLowerCase()
}

// copied from: https://github.com/Uniswap/uniswap-v3-periphery/blob/main/contracts/libraries/LiquidityAmounts.sol
export function getLiquidityForAmounts(
  sqrtRatioX96: BigNumber,
  sqrtRatioAX96: BigNumber,
  sqrtRatioBX96: BigNumber,
  amount0: BigNumber,
  amount1: BigNumber
) {
  if (sqrtRatioAX96.gt(sqrtRatioBX96)) [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96]

  if (sqrtRatioX96.lte(sqrtRatioAX96)) {
    return getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amount0)
  } else if (sqrtRatioX96.lt(sqrtRatioBX96)) {
    const liquidity0 = getLiquidityForAmount0(sqrtRatioX96, sqrtRatioBX96, amount0)
    const liquidity1 = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioX96, amount1)
    return liquidity0.lt(liquidity1) ? liquidity0 : liquidity1
  } else {
    return getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amount1)
  }
}

function getLiquidityForAmount0(sqrtRatioAX96: BigNumber, sqrtRatioBX96: BigNumber, amount0: BigNumber) {
  if (sqrtRatioAX96.gt(sqrtRatioBX96)) [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96]
  const intermediate = sqrtRatioAX96.mul(sqrtRatioBX96).div(BN_2_96)
  return amount0.mul(intermediate).div(sqrtRatioBX96.sub(sqrtRatioAX96))
}

function getLiquidityForAmount1(sqrtRatioAX96: BigNumber, sqrtRatioBX96: BigNumber, amount1: BigNumber) {
  if (sqrtRatioAX96.gt(sqrtRatioBX96)) [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96]
  return amount1.mul(BN_2_96).div(sqrtRatioBX96.sub(sqrtRatioAX96))
}

// copied from: https://github.com/Uniswap/uniswap-v3-core/blob/234f27b9bc745eee37491802aa37a0202649e344/contracts/libraries/TickMath.sol
// sqrt(1.0001^tick) * 2^96
export function getSqrtRatioAtTick(tick: number) {
  const absTick = Math.abs(tick)
  let ratio =
    absTick & 0x1
      ? BigNumber.from('0xfffcb933bd6fad37aa2d162d1a594001')
      : BigNumber.from('0x100000000000000000000000000000000')
  if (absTick & 0x2) ratio = ratio.mul('0xfff97272373d413259a46990580e213a').div(BN_2_128)
  if (absTick & 0x4) ratio = ratio.mul('0xfff2e50f5f656932ef12357cf3c7fdcc').div(BN_2_128)
  if (absTick & 0x8) ratio = ratio.mul('0xffe5caca7e10e4e61c3624eaa0941cd0').div(BN_2_128)
  if (absTick & 0x10) ratio = ratio.mul('0xffcb9843d60f6159c9db58835c926644').div(BN_2_128)
  if (absTick & 0x20) ratio = ratio.mul('0xff973b41fa98c081472e6896dfb254c0').div(BN_2_128)
  if (absTick & 0x40) ratio = ratio.mul('0xff2ea16466c96a3843ec78b326b52861').div(BN_2_128)
  if (absTick & 0x80) ratio = ratio.mul('0xfe5dee046a99a2a811c461f1969c3053').div(BN_2_128)
  if (absTick & 0x100) ratio = ratio.mul('0xfcbe86c7900a88aedcffc83b479aa3a4').div(BN_2_128)
  if (absTick & 0x200) ratio = ratio.mul('0xf987a7253ac413176f2b074cf7815e54').div(BN_2_128)
  if (absTick & 0x400) ratio = ratio.mul('0xf3392b0822b70005940c7a398e4b70f3').div(BN_2_128)
  if (absTick & 0x800) ratio = ratio.mul('0xe7159475a2c29b7443b29c7fa6e889d9').div(BN_2_128)
  if (absTick & 0x1000) ratio = ratio.mul('0xd097f3bdfd2022b8845ad8f792aa5825').div(BN_2_128)
  if (absTick & 0x2000) ratio = ratio.mul('0xa9f746462d870fdf8a65dc1f90e061e5').div(BN_2_128)
  if (absTick & 0x4000) ratio = ratio.mul('0x70d869a156d2a1b890bb3df62baf32f7').div(BN_2_128)
  if (absTick & 0x8000) ratio = ratio.mul('0x31be135f97d08fd981231505542fcfa6').div(BN_2_128)
  if (absTick & 0x10000) ratio = ratio.mul('0x9aa508b5b7a84e1c677de54f3e99bc9').div(BN_2_128)
  if (absTick & 0x20000) ratio = ratio.mul('0x5d6af8dedb81196699c329225ee604').div(BN_2_128)
  if (absTick & 0x40000) ratio = ratio.mul('0x2216e584f5fa1ea926041bedfe98').div(BN_2_128)
  if (absTick & 0x80000) ratio = ratio.mul('0x48a170391f7dc42444e8fa2').div(BN_2_128)

  if (tick > 0) ratio = constants.MaxUint256.div(ratio)

  // this divides by 1<<32 rounding up to go from a Q128.128 to a Q128.96.
  // we then downcast because we know the result always fits within 160 bits due to our tick input constraint
  // we round up in the division so getTickAtSqrtRatio of the output price is always consistent

  return ratio
    .div(BN_2_32)
    .add(ratio.mod(BN_2_32).isZero() ? 0 : 1)
    .mod(BN_2_160)
}

export function getSqrtPriceX96(decimals0: number, decimals1: number, priceRaw: number) {
  const price = bigNumberFromString(decimals1, priceRaw.toString())
  return sqrt(price)
    .mul(BN_2_96)
    .div(BigNumber.from(10).pow(decimals0 / 2))
}
