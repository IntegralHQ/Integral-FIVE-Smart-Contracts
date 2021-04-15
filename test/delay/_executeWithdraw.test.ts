import { expect } from 'chai'
import { constants } from 'ethers'
import { delayFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { overrides } from '../shared/utilities'

describe('IntegralDelay._executeWithdraw', () => {
  const loadFixture = setupFixtureLoader()

  it('can be called only by itself', async () => {
    const { delay, wallet } = await loadFixture(delayFixture)

    await expect(
      delay._executeWithdraw(
        {
          pairId: 0,
          liquidity: 0,
          amount0Min: 0,
          amount1Min: 0,
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
