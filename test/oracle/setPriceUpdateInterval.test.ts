import { expect } from 'chai'

import { setupFixtureLoader } from '../shared/setup'
import { oracleFixture } from '../shared/fixtures'
import { overrides } from '../shared/utilities'

describe('IntegralOracle.setPriceUpdateInterval', () => {
  const loadFixture = setupFixtureLoader()

  it('is set to 5 minutes', async () => {
    const { oracle } = await loadFixture(oracleFixture)
    expect(await oracle.priceUpdateInterval()).to.eq(5 * 60)
  })

  it('can be changed', async () => {
    const { oracle, other } = await loadFixture(oracleFixture)
    await expect(oracle.connect(other.address).setPriceUpdateInterval(2137)).to.be.revertedWith('IO_FORBIDDEN')
    await expect(oracle.setPriceUpdateInterval(0)).to.be.revertedWith('IO_INTERVAL_CANNOT_BE_ZERO')

    await expect(oracle.setPriceUpdateInterval(2137, overrides))
      .to.emit(oracle, 'PriceUpdateIntervalSet')
      .withArgs(2137)
    expect(await oracle.priceUpdateInterval()).to.eq(2137)
  })
})
