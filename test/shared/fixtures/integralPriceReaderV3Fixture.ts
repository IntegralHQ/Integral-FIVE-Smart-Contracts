import { Wallet } from 'ethers'
import { IntegralPriceReader__factory } from '../../../build/types'
import { integralAndUniswapV3Fixture } from './integralAndUniswapV3Fixture'
import { getOracleV3FixtureFor } from './getOracleV3FixtureFor'
import { deployPairForTokens } from './deployPairForTokens'
import { deployTokens } from './deployTokens'

export async function priceReaderV3Fixture([wallet]: Wallet[]) {
  const {
    factory,
    token0,
    token1,
    oracle01: oracle,
    oracle23: oracleNotSet,
    uniswapPool01: uniswapPool,
    swapOnUniswap,
  } = await integralAndUniswapV3Fixture([wallet])
  const { oracle: oracleWithoutUniswap } = await getOracleV3FixtureFor(18, 18)([wallet])
  const { token0: token2, token1: token3 } = await deployTokens(18, 18, wallet)
  await deployPairForTokens(wallet, oracleWithoutUniswap.address, factory, token2, token3)
  const priceReader = await new IntegralPriceReader__factory(wallet).deploy(factory.address)
  await priceReader.setOracleV3(oracle.address, true)
  await priceReader.setOracleV3(oracleWithoutUniswap.address, true)
  return { priceReader, factory, token0, token1, token2, token3, oracle, oracleNotSet, uniswapPool, swapOnUniswap }
}
