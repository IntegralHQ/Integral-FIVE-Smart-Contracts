import { Wallet } from 'ethers'
import { VotesTest__factory } from '../../../build/types'

export async function votesFixture([wallet]: Wallet[]) {
  const votes = await new VotesTest__factory(wallet).deploy()
  return { votes }
}
