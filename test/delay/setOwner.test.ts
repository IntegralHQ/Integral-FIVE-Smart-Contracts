import { expect } from 'chai'
import { delayFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { overrides } from '../shared/utilities'

describe('IntegralDelay.setOwner', () => {
  const loadFixture = setupFixtureLoader()

  it('is set to the deployer', async () => {
    const { delay, wallet } = await loadFixture(delayFixture)
    expect(await delay.owner()).to.eq(wallet.address)
  })

  it('can be changed', async () => {
    const { delay, other } = await loadFixture(delayFixture)
    await expect(delay.connect(other).setOwner(other.address, overrides)).to.be.revertedWith('ID_FORBIDDEN')

    await expect(delay.setOwner(other.address, overrides)).to.emit(delay, 'OwnerSet').withArgs(other.address)
    expect(await delay.owner()).to.eq(other.address)
  })
})
