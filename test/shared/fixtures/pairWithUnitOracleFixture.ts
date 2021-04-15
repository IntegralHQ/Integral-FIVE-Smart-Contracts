import { Wallet } from 'ethers'

import { overrides } from '../utilities'

import { UnitOracle__factory } from '../../../build/types'

import { factoryFixture } from './factoryFixture'
import { deployPair } from './deployPair'

export async function pairWithUnitOracleFixture([wallet]: Wallet[]) {
  const oracle = await new UnitOracle__factory(wallet).deploy(overrides)
  const { factory } = await factoryFixture([wallet])
  return deployPair(wallet, oracle, factory)
}
