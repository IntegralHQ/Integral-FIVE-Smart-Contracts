import { expect } from 'chai'

import { expandTo18Decimals, overrides } from '../shared/utilities'
import { pairFixture, pairWithUnitOracleFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralPair.syncWithOracle', () => {
  const loadFixture = setupFixtureLoader()

  it('has balance at last oracle update', async () => {
    const { addLiquidity, pair, oracle } = await loadFixture(pairFixture)
    const reserve0 = expandTo18Decimals(15)
    const reserve1 = expandTo18Decimals(40)

    const referencesBefore = await pair.getReferences()
    expect(referencesBefore[0]).to.eq(0)
    expect(referencesBefore[1]).to.eq(0)

    await addLiquidity(reserve0, reserve1)
    await oracle.setPrice(expandTo18Decimals(400), overrides)
    await pair.syncWithOracle(overrides)

    const referencesAfter = await pair.getReferences()
    expect(referencesAfter[0]).to.eq(reserve0)
    expect(referencesAfter[1]).to.eq(reserve1)
  })

  it('calls updatePrice in oracle', async () => {
    const { pair, oracle } = await loadFixture(pairWithUnitOracleFixture)
    await expect(pair.syncWithOracle(overrides)).to.emit(oracle, 'UpdatePrice')
  })
})
