import { Wallet } from 'ethers'
import { CustomERC20__factory, UniswapV3PoolTest__factory } from '../../../build/types'
import { overrides } from '../utilities'
import { deployTokens } from './deployTokens'
import { getOracleV3FixtureFor } from './getOracleV3FixtureFor'

export async function oracleV3Fixture([wallet]: Wallet[]) {
  const { oracle } = await getOracleV3FixtureFor(18, 18)([wallet])
  const { token0, token1 } = await deployTokens(18, 18, wallet)

  async function getEmptyPool() {
    return new UniswapV3PoolTest__factory(wallet).deploy(0, token0.address, token1.address, overrides)
  }

  async function getInvalidDecimalsPool() {
    const anotherToken = await new CustomERC20__factory(wallet).deploy('Another token', 'ATKN', 6, 1000, overrides)
    return new UniswapV3PoolTest__factory(wallet).deploy(1000, token0.address, anotherToken.address, overrides)
  }

  const pool = await new UniswapV3PoolTest__factory(wallet).deploy(1000, token0.address, token1.address, overrides)
  return { oracle, pool, getEmptyPool, getInvalidDecimalsPool }
}
