import { Wallet } from 'ethers'

import { expandTo18Decimals, overrides } from '../utilities'
import { pairFixture } from './pairFixture'

export async function pairWithLimitsFixture([wallet]: Wallet[]) {
  const result = await pairFixture([wallet])
  await result.factory.setToken0AbsoluteLimit(
    result.token0.address,
    result.token1.address,
    expandTo18Decimals(1000),
    overrides
  )
  await result.factory.setToken1AbsoluteLimit(
    result.token0.address,
    result.token1.address,
    expandTo18Decimals(1000),
    overrides
  )
  await result.factory.setToken0RelativeLimit(
    result.token0.address,
    result.token1.address,
    expandTo18Decimals(0.9),
    overrides
  )
  await result.factory.setToken1RelativeLimit(
    result.token0.address,
    result.token1.address,
    expandTo18Decimals(0.9),
    overrides
  )
  await result.factory.setPriceDeviationLimit(
    result.token0.address,
    result.token1.address,
    expandTo18Decimals(0.05),
    overrides
  )
  return result
}
