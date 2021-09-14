import { Wallet } from 'ethers'

import { expandTo18Decimals, overrides } from '../utilities'
import { DeflatingERC20__factory, IntegralFactory, IntegralOracle, UnitOracle, WETH9 } from '../../../build/types'
import { deployPairForTokens } from './deployPairForTokens'

export async function deployDttWethPair(
  wallet: Wallet,
  oracle: IntegralOracle | UnitOracle,
  factory: IntegralFactory,
  weth: WETH9
) {
  const dtt = await new DeflatingERC20__factory(wallet).deploy(expandTo18Decimals(10000), overrides)
  const pair = await deployPairForTokens(wallet, oracle.address, factory, weth, dtt)
  return { ...pair, oracle }
}
