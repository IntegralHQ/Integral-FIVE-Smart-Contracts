import { Wallet } from 'ethers'

import { expandTo18Decimals, overrides } from '../utilities'
import { ERC20__factory, IntegralOracle, IntegralFactory, UnitOracle } from '../../../build/types'
import { deployPairForTokens } from './deployPairForTokens'

export async function deployPair(wallet: Wallet, oracle: IntegralOracle | UnitOracle, factory: IntegralFactory) {
  const tokenA = await new ERC20__factory(wallet).deploy(expandTo18Decimals(1000000000000), overrides)
  const tokenB = await new ERC20__factory(wallet).deploy(expandTo18Decimals(1000000000000), overrides)

  return deployPairForTokens(wallet, oracle, factory, tokenA, tokenB)
}
