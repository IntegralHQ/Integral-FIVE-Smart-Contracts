import { Wallet } from 'ethers'
import { IntegralTimeReleaseTest__factory } from '../../../build/types'
import { IntegralTokenTest__factory } from '../../../build/types/factories/IntegralTokenTest__factory'
import { expandTo18Decimals, overrides } from '../utilities'

export async function timeReleaseFixture([wallet]: Wallet[]) {
  const token = await new IntegralTokenTest__factory(wallet).deploy(
    wallet.address,
    expandTo18Decimals(1000000),
    overrides
  )
  const timeRelease = await new IntegralTimeReleaseTest__factory(wallet).deploy(token.address, 0, 100, 0, 100)

  async function setupTimeRelease(option1Timeframe: number[], option2Timeframe: number[]) {
    await timeRelease.setOption1Timeframe(option1Timeframe[0], option1Timeframe[1])
    await timeRelease.setOption2Timeframe(option2Timeframe[0], option2Timeframe[1])

    return async function setAllocations(_wallet: Wallet, option1Raw: number, option2Raw: number) {
      const option1Allocation = expandTo18Decimals(option1Raw)
      const option2Allocation = expandTo18Decimals(option2Raw)
      await token.mint(timeRelease.address, option1Allocation.add(option2Allocation))
      option1Raw && (await timeRelease.initOption1Allocations([_wallet.address], [option1Allocation]))
      option2Raw && (await timeRelease.initOption2Allocations([_wallet.address], [option2Allocation]))
    }
  }

  return { timeRelease, token, setupTimeRelease }
}
