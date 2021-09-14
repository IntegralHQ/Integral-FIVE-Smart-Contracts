import { Wallet } from 'ethers'

import { expandTo18Decimals, overrides } from '../utilities'

import { ERC20__factory, IntegralOracle, IntegralFactory, UnitOracle } from '../../../build/types'

import { deployPairForTokens } from './deployPairForTokens'
import { deployPair } from './deployPair'

export async function deployPairs(wallet: Wallet, oracle: IntegralOracle | UnitOracle, factory: IntegralFactory) {
  const pair0 = await deployPair(wallet, oracle, factory)
  const token = await new ERC20__factory(wallet).deploy(expandTo18Decimals(10000), overrides)
  const pair1 = await deployPairForTokens(wallet, oracle.address, factory, pair0.token1, token)
  return { pair0, pair1 }
}
