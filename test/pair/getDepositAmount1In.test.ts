import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { pairFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, overrides } from '../shared/utilities'

describe('IntegralPair.getDepositAmount1In', () => {
  const loadFixture = setupFixtureLoader()

  it('returns 0 when reserves are 0', async () => {
    const { pair } = await loadFixture(pairFixture)
    expect(await pair.getDepositAmount1In(expandTo18Decimals(1))).to.deep.eq(BigNumber.from(0))
  })

  it('returns amount1In for price = 1', async () => {
    const { pair, oracle, addLiquidity } = await loadFixture(pairFixture)
    await oracle.setPrice(expandTo18Decimals(1), overrides)
    await addLiquidity(expandTo18Decimals(2), expandTo18Decimals(1))
    expect(await pair.getDepositAmount1In(expandTo18Decimals(3))).to.deep.eq(expandTo18Decimals(1))
  })

  it('returns amount1In for price < 1', async () => {
    const { pair, oracle, addLiquidity } = await loadFixture(pairFixture)
    await oracle.setPrice(expandTo18Decimals(0.25), overrides)
    await addLiquidity(expandTo18Decimals(2), expandTo18Decimals(1))
    expect(await pair.getDepositAmount1In(expandTo18Decimals(3))).to.deep.eq(parseUnits('0.333333333333333333'))
  })

  it('returns amount1In for price > 1', async () => {
    const { pair, oracle, addLiquidity } = await loadFixture(pairFixture)
    await oracle.setPrice(expandTo18Decimals(1.25), overrides)
    await addLiquidity(expandTo18Decimals(4), expandTo18Decimals(1))
    expect(await pair.getDepositAmount1In(expandTo18Decimals(3))).to.deep.eq(parseUnits('1.666666666666666666'))
  })
})
