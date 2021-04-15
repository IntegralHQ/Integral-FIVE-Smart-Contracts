import { expect } from 'chai'
import { setupFixtureLoader } from '../shared/setup'
import { pairFixture, pairWithUnitOracleFixture } from '../shared/fixtures'
import { expandTo18Decimals, overrides } from '../shared/utilities'

describe('IntegralPair.setPriceDeviationLimit', () => {
  const loadFixture = setupFixtureLoader()

  it('can only be called by factory', async () => {
    const { pair } = await loadFixture(pairWithUnitOracleFixture)
    await expect(pair.setPriceDeviationLimit(100)).to.be.revertedWith('IP_FORBIDDEN')
  })

  it('reverts when price deviation is too high', async () => {
    const { factory, pair, addLiquidity, oracle, token0, token1, wallet } = await loadFixture(pairFixture)
    await expect(factory.setPriceDeviationLimit(token0.address, token1.address, expandTo18Decimals(0.05), overrides))
      .to.emit(pair, 'SetPriceDeviationLimit')
      .withArgs(expandTo18Decimals(0.05))
    await oracle.setPrice(expandTo18Decimals(1))
    const amount = 100000
    await addLiquidity(expandTo18Decimals(amount), expandTo18Decimals(amount))

    await token0.transfer(pair.address, expandTo18Decimals(amount), overrides)
    await expect(pair.swap(0, expandTo18Decimals(amount / 2), wallet.address, overrides)).to.be.revertedWith(
      'IP_P_LIMIT_EXCEEDED'
    )
  })
})
