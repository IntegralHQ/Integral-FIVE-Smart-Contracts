import { Wallet } from 'ethers'
import { IntegralPointsToken__factory } from '../../../build/types'
import { expandTo18Decimals } from '../utilities'

export async function pointsTokenFixture([wallet]: Wallet[]) {
  const token = await new IntegralPointsToken__factory(wallet).deploy(wallet.address, expandTo18Decimals(10000))
  return { token }
}
