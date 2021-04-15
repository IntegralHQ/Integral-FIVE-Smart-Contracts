import { constants, Wallet } from 'ethers'

import { IntegralOracle, UnitOracle, IntegralFactory, DelayTest__factory } from '../../../build/types'
import { deployWethPair } from './deployWethPair'
import { deployLibraries } from './deployLibraries'

export async function deployDelayAndWeth(
  wallet: Wallet,
  oracle: IntegralOracle | UnitOracle,
  factory: IntegralFactory
) {
  const { weth, token, pair: wethPair, addLiquidityETH } = await deployWethPair(wallet, oracle, factory)
  const { libraries, orders, tokenShares, buyHelper } = await deployLibraries(wallet)
  const delay = await new DelayTest__factory(libraries, wallet).deploy(
    factory.address,
    weth.address,
    constants.AddressZero
  )
  return { delay, token, wethPair, addLiquidityETH, weth, orders, tokenShares, libraries, buyHelper }
}
