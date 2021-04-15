import { Wallet } from 'ethers'
import { AddLiquidityTest__factory } from '../../../build/types'
import { pairFixture } from './pairFixture'
import { deployLibraries } from './deployLibraries'

export async function addLiquidityFixture([wallet]: Wallet[]) {
  const pair = await pairFixture([wallet])
  const { libraries } = await deployLibraries(wallet)
  const delay = await new AddLiquidityTest__factory(libraries, wallet).deploy()
  return { delay, ...pair }
}
