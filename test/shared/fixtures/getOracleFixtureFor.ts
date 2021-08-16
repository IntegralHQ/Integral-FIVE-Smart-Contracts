import { Wallet } from 'ethers'
import { OracleTest__factory } from '../../../build/types'
import { parameters } from '../parameters'
import { overrides } from '../utilities'

export function getOracleFixtureFor(xDecimals: number, yDecimals: number) {
  return async function ([wallet]: Wallet[]) {
    const oracle = await new OracleTest__factory(wallet).deploy(xDecimals, yDecimals, overrides)
    await oracle.setParameters(...parameters)
    return { oracle }
  }
}
