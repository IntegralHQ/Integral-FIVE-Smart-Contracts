import { Wallet } from 'ethers'

import { oracleFixture } from './oracleFixture'
import { factoryFixture } from './factoryFixture'
import { deployPair } from './deployPair'

export async function pairFixture([wallet]: Wallet[]) {
  const { oracle } = await oracleFixture([wallet])
  const { factory } = await factoryFixture([wallet])
  const result = await deployPair(wallet, oracle, factory)

  async function getAnotherOracle() {
    const { oracle: otherOracle } = await oracleFixture([wallet])
    return { otherOracle }
  }

  return { ...result, oracle, getAnotherOracle }
}
