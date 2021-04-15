import { Wallet } from 'ethers'

import { overrides } from '../utilities'

import { IntegralFactory__factory } from '../../../build/types'

export async function factoryFixture([wallet]: Wallet[]) {
  const factory = await new IntegralFactory__factory(wallet).deploy(overrides)
  return { factory }
}
