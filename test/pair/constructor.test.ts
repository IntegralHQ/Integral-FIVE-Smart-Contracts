import { expect } from 'chai'

import { pairFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralPair.constructor', () => {
  const loadFixture = setupFixtureLoader()

  it('correctly sets up the initial state', async () => {
    const { pair } = await loadFixture(pairFixture)
    expect(await pair.name()).to.eq('Integral LP')
    expect(await pair.symbol()).to.eq('ITGR-LP')
    expect(await pair.decimals()).to.eq(18)
  })
})
