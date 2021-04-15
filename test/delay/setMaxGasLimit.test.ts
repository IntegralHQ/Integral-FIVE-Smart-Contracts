import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { delayFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { overrides } from '../shared/utilities'

describe('IntegralDelay.setMaxGasLimit', () => {
  const loadFixture = setupFixtureLoader()

  it('is 5M by default', async () => {
    const { delay } = await loadFixture(delayFixture)
    expect(await delay.maxGasLimit()).to.eq(5_000_000)
  })

  it('can be changed', async () => {
    const { delay, other } = await loadFixture(delayFixture)
    await expect(delay.connect(other.address).setMaxGasLimit(1)).to.be.revertedWith('ID_FORBIDDEN')

    await expect(delay.setMaxGasLimit(1, overrides)).to.emit(delay, 'MaxGasLimitSet').withArgs(BigNumber.from(1))
    expect(await delay.maxGasLimit()).to.eq(1)
  })

  it('limit to block gas limit', async () => {
    const { delay } = await loadFixture(delayFixture)
    await expect(delay.setMaxGasLimit(11_000_000, overrides)).to.be.revertedWith('OS_MAX_GAS_LIMIT_TOO_HIGH')
  })
})
