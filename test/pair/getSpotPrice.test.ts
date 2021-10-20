import { expect } from 'chai'

import { expandTo18Decimals, overrides } from '../shared/utilities'
import { pairFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralPair.getSpotPrice', () => {
  const loadFixture = setupFixtureLoader()

  it('returns the current spot price', async () => {
    const { addLiquidity, oracle, pair } = await loadFixture(pairFixture)

    await addLiquidity(expandTo18Decimals(1), expandTo18Decimals(4))
    await oracle.setPrice(expandTo18Decimals(15), overrides)
    await pair.syncWithOracle()
    expect(await pair.getSpotPrice()).to.eq(expandTo18Decimals(15))
  })

  it('is sensitive to oracle updates', async () => {
    const { addLiquidity, oracle, pair } = await loadFixture(pairFixture)

    await addLiquidity(expandTo18Decimals(1), expandTo18Decimals(4))
    await oracle.setPrice(expandTo18Decimals(15), overrides)
    await pair.syncWithOracle()
    expect(await pair.getSpotPrice()).to.eq(expandTo18Decimals(15))
  })

  it('passes the correct values', async () => {
    const { addLiquidity, oracle, pair, token0 } = await loadFixture(pairFixture)

    await addLiquidity(expandTo18Decimals(1), expandTo18Decimals(4))
    await oracle.setPrice(expandTo18Decimals(15), overrides)
    await token0.transfer(pair.address, expandTo18Decimals(10))
    await pair.sync()
    expect(await pair.getSpotPrice()).to.be.lt(expandTo18Decimals(25))
  })
})
