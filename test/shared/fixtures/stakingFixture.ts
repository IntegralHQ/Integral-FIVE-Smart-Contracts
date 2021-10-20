import { Wallet, constants } from 'ethers'
import { IntegralStaking__factory } from '../../../build/types'
import { overrides } from '../utilities'
import { tokenFixture } from './tokenFixture'

const BLOCKS_PER_ONE_YEAR_IN_TESTS = 20 // in fact: (86400 / 15) * 365

export async function stakingFixture([wallet]: Wallet[]) {
  const { token } = await tokenFixture([wallet])

  // staking 1 for 0.5 year + 20%
  const stakingPeriod = BLOCKS_PER_ONE_YEAR_IN_TESTS / 2
  const ratePerBlockNumerator = 20
  const ratePerBlockDenominator = BLOCKS_PER_ONE_YEAR_IN_TESTS * 100
  const staking = await new IntegralStaking__factory(wallet).deploy(
    token.address,
    stakingPeriod,
    ratePerBlockNumerator,
    ratePerBlockDenominator,
    overrides
  )

  await token.setMinter(staking.address, true, overrides)
  await token.approve(staking.address, constants.MaxUint256, overrides)

  return { token, staking, stakingPeriod, ratePerBlockNumerator, ratePerBlockDenominator }
}
