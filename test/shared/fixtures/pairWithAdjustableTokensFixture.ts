import { Wallet } from 'ethers'

import { AdjustableERC20__factory, UnitOracle__factory } from '../../../build/types'
import { overrides } from '../utilities'
import { deployPairForTokens } from './deployPairForTokens'
import { factoryFixture } from './factoryFixture'

export async function pairWithAdjustableTokensFixture([wallet]: Wallet[]) {
  const oracle = await new UnitOracle__factory(wallet).deploy(overrides)
  const { factory } = await factoryFixture([wallet])
  const tokenA = await new AdjustableERC20__factory(wallet).deploy(0, overrides)
  const tokenB = await new AdjustableERC20__factory(wallet).deploy(0, overrides)
  return deployPairForTokens(wallet, oracle, factory, tokenA, tokenB)
}
