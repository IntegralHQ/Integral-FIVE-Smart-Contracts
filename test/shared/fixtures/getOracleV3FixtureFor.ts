import { Wallet } from 'ethers'
import { IntegralOracleV3__factory } from '../../../build/types'
import { parameters } from '../parameters'
import { overrides } from '../utilities'

export function getOracleV3FixtureFor(xDecimals: number, yDecimals: number) {
  return async function ([wallet]: Wallet[]) {
    const oracle = await new IntegralOracleV3__factory(wallet).deploy(xDecimals, yDecimals, overrides)
    await oracle.setParameters(...parameters)
    return { oracle }
  }
}
