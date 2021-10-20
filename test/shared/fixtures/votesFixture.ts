import { Wallet } from 'ethers'
import { VotesTest__factory } from '../../../build/types'
import { overrides } from '../utilities'

export async function votesFixture([wallet]: Wallet[]) {
  const votes = await new VotesTest__factory(wallet).deploy(overrides)
  return { votes }
}
