import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { delayFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { overrides } from '../shared/utilities'

describe('IntegralDelay.setDelay', () => {
  const loadFixture = setupFixtureLoader()

  it('is set to 5 minutes', async () => {
    const { delay } = await loadFixture(delayFixture)
    expect(await delay.delay()).to.eq(5 * 60)
  })

  it('can be changed', async () => {
    const { delay, other } = await loadFixture(delayFixture)
    await expect(delay.connect(other.address).setDelay(6 * 60)).to.be.revertedWith('ID_FORBIDDEN')

    await expect(delay.setDelay(6 * 60, overrides))
      .to.emit(delay, 'DelaySet')
      .withArgs(BigNumber.from(6 * 60))
    expect(await delay.delay()).to.eq(6 * 60)
    expect(await delay.botExecuteTime()).to.eq(4 * 6 * 60)
  })
})
