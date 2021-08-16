import { Wallet } from 'ethers'
import { IntegralPriceReader__factory } from '../../../build/types'
import { integralAndUniswapFixture } from './integralAndUniswapFixture'
import { deployPairForTokens } from './deployPairForTokens'
import { getOracleFixtureFor } from './getOracleFixtureFor'
import { deployTokens } from './deployTokens'

export async function priceReaderV2Fixture([wallet, other]: Wallet[]) {
  const {
    factory,
    token0,
    token1,
    oracle01: oracle,
    uniswapPair01,
    swapOnUniswapPair,
  } = await integralAndUniswapFixture([wallet])

  const { oracle: oracle23 } = await getOracleFixtureFor(18, 18)([wallet])
  const { token0: token2, token1: token3 } = await deployTokens(18, 18, wallet)

  await deployPairForTokens(wallet, oracle23, factory, token2, token3)

  const priceReader = await new IntegralPriceReader__factory(wallet).deploy(factory.address)
  return {
    wallet,
    other,
    priceReader,
    factory,
    token0,
    token1,
    token2,
    token3,
    oracle,
    uniswapPair01,
    swapOnUniswapPair,
  }
}
