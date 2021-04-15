import { Wallet } from 'ethers'

import { overrides } from '../utilities'
import { NormalizerTest__factory } from '../../../build/types'

export async function normalizerFixture([wallet]: Wallet[]) {
  const normalizer = await new NormalizerTest__factory(wallet).deploy(overrides)
  return { normalizer }
}
