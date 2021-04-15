import { expect } from 'chai'
import { constants } from 'ethers'
import { delayFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, overrides } from '../shared/utilities'

describe('IntegralDelay._executeSell', () => {
  const loadFixture = setupFixtureLoader()

  it('can be called only by itself', async () => {
    const { delay, wallet } = await loadFixture(delayFixture)

    await expect(
      delay._executeSell(
        {
          pairId: 0,
          inverse: false,
          shareIn: expandTo18Decimals(1),
          amountOutMin: expandTo18Decimals(1),
          unwrap: false,
          to: wallet.address,
          gasPrice: 0,
          gasLimit: 100000,
          deadline: constants.MaxUint256,
        },
        overrides
      )
    ).to.be.revertedWith('ID_FORBIDDEN')
  })
})
