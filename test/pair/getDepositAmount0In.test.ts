import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { pairFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals } from '../shared/utilities'

describe('IntegralPair.getDepositAmount0In', () => {
  const loadFixture = setupFixtureLoader()

  it('returns 0 when reserves are 0', async () => {
    const { pair } = await loadFixture(pairFixture)
    expect(await pair.getDepositAmount0In(expandTo18Decimals(1))).to.deep.eq(BigNumber.from(0))
  })

  it('returns amount0In for price = 1', async () => {
    const { pair, oracle, addLiquidity } = await loadFixture(pairFixture)
    await oracle.setPrice(expandTo18Decimals(1))
    await addLiquidity(expandTo18Decimals(1), expandTo18Decimals(2))
    expect(await pair.getDepositAmount0In(expandTo18Decimals(3))).to.deep.eq(expandTo18Decimals(1))
  })

  it('returns amount0In for price < 1', async () => {
    const { pair, oracle, addLiquidity } = await loadFixture(pairFixture)
    await oracle.setPrice(expandTo18Decimals(0.25))
    await addLiquidity(expandTo18Decimals(1), expandTo18Decimals(2))
    expect(await pair.getDepositAmount0In(expandTo18Decimals(3))).to.deep.eq(expandTo18Decimals(2))
  })

  it('returns amount0In for price > 1', async () => {
    const { pair, oracle, addLiquidity } = await loadFixture(pairFixture)
    await oracle.setPrice(expandTo18Decimals(1.25))
    await addLiquidity(expandTo18Decimals(1), expandTo18Decimals(4))
    expect(await pair.getDepositAmount0In(expandTo18Decimals(3))).to.deep.eq(parseUnits('1.333333333333333333'))
  })
})
