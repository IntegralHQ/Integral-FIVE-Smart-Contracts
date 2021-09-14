import { Wallet } from 'ethers'

import { DeflatingERC20__factory, IntegralOracle, IntegralFactory, UnitOracle } from '../../../build/types'
import { expandTo18Decimals, overrides } from '../utilities'
import { deployPairForTokens } from './deployPairForTokens'
import { deployDttPair } from './deployDttPair'

export async function deployDttPairs(wallet: Wallet, oracle: IntegralOracle | UnitOracle, factory: IntegralFactory) {
  const pair0 = await deployDttPair(wallet, oracle, factory)
  const dtt = await new DeflatingERC20__factory(wallet).deploy(expandTo18Decimals(10000), overrides)
  const pair1 = await deployPairForTokens(wallet, oracle.address, factory, pair0.token1, dtt)

  return { pair0, pair1 }
}
