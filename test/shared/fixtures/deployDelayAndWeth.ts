import { Wallet } from 'ethers'

import { IntegralOracle, UnitOracle, IntegralFactory, IntegralOracleV3 } from '../../../build/types'
import { deployWethPair } from './deployWethPair'
import { deployDelay } from './deployDelay'

export async function deployDelayAndWeth(
  wallet: Wallet,
  oracle: IntegralOracle | UnitOracle | IntegralOracleV3,
  factory: IntegralFactory
) {
  const { weth, token, pair: wethPair, addLiquidityETH } = await deployWethPair(wallet, oracle, factory)
  const { delay, ...libraries } = await deployDelay(wallet, factory, weth)
  return { token, wethPair, addLiquidityETH, weth, delay, ...libraries }
}
