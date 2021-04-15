import { expect } from 'chai'
import { constants } from 'ethers'
import { delayFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { overrides } from '../shared/utilities'

describe('IntegralDelay._executeDeposit', () => {
  const loadFixture = setupFixtureLoader()

  it('can be called only by itself', async () => {
    const { delay, wallet } = await loadFixture(delayFixture)

    await expect(
      delay._executeDeposit(
        {
          pairId: 0,
          share0: 0,
          share1: 0,
          initialRatio: 1,
          minRatioChangeToSwap: 10,
          minSwapPrice: 0,
          maxSwapPrice: 0,
          unwrap: false,
          to: wallet.address,
          gasPrice: 0,
          gasLimit: 0,
          deadline: constants.MaxUint256,
        },
        overrides
      )
    ).to.be.revertedWith('ID_FORBIDDEN')
  })
})
