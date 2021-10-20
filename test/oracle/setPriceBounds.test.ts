import { expect } from 'chai'
import { oracleV3Fixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { overrides } from '../shared/utilities'

describe('IntegralOracleV3.setPriceBounds', () => {
  const loadFixture = setupFixtureLoader()

  it('performs security checkings', async () => {
    const { oracle, other } = await loadFixture(oracleV3Fixture)
    await expect(oracle.connect(other).setPriceBounds(0, 1)).to.be.revertedWith('IO_FORBIDDEN')
    await expect(oracle.setPriceBounds(1, 0)).to.be.revertedWith('IO_INVALID_BOUNDS')
  })

  it('can be changed', async () => {
    const { oracle } = await loadFixture(oracleV3Fixture)
    const minPrice = 200
    const maxPrice = 400
    await expect(oracle.setPriceBounds(minPrice, maxPrice, overrides))
      .to.emit(oracle, 'PriceBoundsSet')
      .withArgs(minPrice, maxPrice)
    expect(await oracle.minPrice()).to.eq(minPrice)
    expect(await oracle.maxPrice()).to.eq(maxPrice)
  })
})
