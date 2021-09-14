import { Wallet } from 'ethers'

import { DeflatingERC20__factory, IntegralOracle, IntegralFactory, UnitOracle } from '../../../build/types'
import { expandTo18Decimals, overrides } from '../utilities'
import { deployPairForTokens } from './deployPairForTokens'

export async function deployDttPair(wallet: Wallet, oracle: IntegralOracle | UnitOracle, factory: IntegralFactory) {
  const dtt1 = await new DeflatingERC20__factory(wallet).deploy(expandTo18Decimals(10000), overrides)
  const dtt2 = await new DeflatingERC20__factory(wallet).deploy(expandTo18Decimals(10000), overrides)
  const pair = await deployPairForTokens(wallet, oracle.address, factory, dtt1, dtt2)
  return { ...pair, oracle }
}
