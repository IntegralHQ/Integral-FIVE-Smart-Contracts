import { Wallet } from 'ethers'
import { IntegralToken__factory } from '../../../build/types'
import { expandTo18Decimals, overrides } from '../utilities'

export async function tokenFixture([wallet]: Wallet[]) {
  const token = await new IntegralToken__factory(wallet).deploy(
    wallet.address,
    expandTo18Decimals(10_000_000_000),
    overrides
  )
  return { token }
}
