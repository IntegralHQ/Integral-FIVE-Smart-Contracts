import { Wallet } from 'ethers'
import { IntegralToken__factory } from '../../../build/types'
import { expandTo18Decimals } from '../utilities'

export async function tokenFixture([wallet]: Wallet[]) {
  const token = await new IntegralToken__factory(wallet).deploy(wallet.address, expandTo18Decimals(10000))
  return { token }
}
