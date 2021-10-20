import { expect } from 'chai'

import { expandTo18Decimals, overrides } from '../shared/utilities'
import { pairFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralPair.getSwapAmount1Out', () => {
  const loadFixture = setupFixtureLoader()

  it('returns the number of token1 swapped for token0', async () => {
    const { addLiquidity, oracle, token0, token1, pair, wallet } = await loadFixture(pairFixture)

    const amount0In = expandTo18Decimals(2)

    await addLiquidity(expandTo18Decimals(5), expandTo18Decimals(10))
    await oracle.setPrice(expandTo18Decimals(2), overrides)
    await pair.syncWithOracle(overrides)

    const amount1Out = await pair.getSwapAmount1Out(amount0In)

    const balance1Before = await token1.balanceOf(wallet.address)
    await token0.transfer(pair.address, amount0In, overrides)
    await pair.swap(0, amount1Out, wallet.address, overrides)

    const balance1After = await token1.balanceOf(wallet.address)
    expect(balance1After.sub(balance1Before)).to.eq(amount1Out)
  })

  it('returns correct values', async () => {
    const { addLiquidity, oracle, token0, pair, wallet, getState } = await loadFixture(pairFixture)
    await oracle.setPrice(expandTo18Decimals('379.55'), overrides)
    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(2137))

    const inputAmount = expandTo18Decimals(1)
    const expectedOutputAmount = expandTo18Decimals('378.411222600973572583')

    expect(await pair.getSwapAmount1Out(inputAmount)).to.eq(expectedOutputAmount)
    const before = await getState()
    expect(before.reserves[0]).to.eq(expandTo18Decimals(100))
    expect(before.reserves[1]).to.eq(expandTo18Decimals(2137))
    expect(before.references[0]).to.eq(expandTo18Decimals(100))
    expect(before.references[1]).to.eq(expandTo18Decimals(2137))

    await token0.transfer(pair.address, inputAmount, overrides)
    await pair.swap(0, expectedOutputAmount, wallet.address, overrides)

    const inputAmount2 = expandTo18Decimals(1)
    const expectedOutputAmount2 = expandTo18Decimals('378.410967802920717751')

    expect(await pair.getSwapAmount1Out(inputAmount2)).to.eq(expectedOutputAmount2)

    const after = await getState()
    expect(after.reserves[0]).to.eq(expandTo18Decimals(100.997))
    expect(after.reserves[1]).to.eq(expandTo18Decimals('1758.588777399026427417'))
    expect(after.references[0]).to.eq(expandTo18Decimals(100))
    expect(after.references[1]).to.eq(expandTo18Decimals(2137))
  })
})
