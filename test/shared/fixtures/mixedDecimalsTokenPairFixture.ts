import { Wallet } from 'ethers'

import { expandTo18Decimals, overrides } from '../utilities'
import { ERC20__factory, CustomERC20__factory } from '../../../build/types'
import { getOracleFixtureFor } from './getOracleFixtureFor'
import { factoryFixture } from './factoryFixture'
import { deployPairForTokens } from './deployPairForTokens'

export async function mixedDecimalsTokenPairFixture([wallet]: Wallet[]) {
  const eightDecimalsToken = await new CustomERC20__factory(wallet).deploy(
    'EightToken',
    'ET',
    8,
    expandTo18Decimals(10000),
    overrides
  )
  const token = await new ERC20__factory(wallet).deploy(expandTo18Decimals(10000), overrides)
  const { oracle } = await getOracleFixtureFor(8, 18)([wallet])
  const { factory } = await factoryFixture([wallet])

  return deployPairForTokens(wallet, oracle, factory, eightDecimalsToken, token)
}
