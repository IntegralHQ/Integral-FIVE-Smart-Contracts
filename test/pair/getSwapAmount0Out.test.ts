import { expect } from 'chai'

import { expandTo18Decimals, overrides } from '../shared/utilities'
import { pairFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralPair.getSwapAmount0Out', () => {
  const loadFixture = setupFixtureLoader()

  it('returns the number of token0 swapped for token1', async () => {
    const { addLiquidity, oracle, token0, token1, pair, wallet } = await loadFixture(pairFixture)

    const amount1In = expandTo18Decimals(1)

    await addLiquidity(expandTo18Decimals(5), expandTo18Decimals(10))
    await oracle.setPrice(expandTo18Decimals(2), overrides)
    await pair.syncWithOracle(overrides)

    const amount0Out = await pair.getSwapAmount0Out(amount1In)

    const balance0Before = await token0.balanceOf(wallet.address)
    await token1.transfer(pair.address, amount1In, overrides)
    await pair.swap(amount0Out, 0, wallet.address, overrides)

    const balance0After = await token0.balanceOf(wallet.address)
    expect(balance0After.sub(balance0Before)).to.eq(amount0Out)
  })

  it('returns correct values', async () => {
    const { addLiquidity, oracle, token1, pair, wallet, getState } = await loadFixture(pairFixture)
    await oracle.setPrice(expandTo18Decimals('379.55'), overrides)
    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(2137))

    const inputAmount = expandTo18Decimals(100)
    const expectedOutputAmount = expandTo18Decimals('0.262679462126898640')

    expect(await pair.getSwapAmount0Out(inputAmount)).to.eq(expectedOutputAmount)
    const before = await getState()
    expect(before.reserves[0]).to.eq(expandTo18Decimals(100))
    expect(before.reserves[1]).to.eq(expandTo18Decimals(2137))
    expect(before.references[0]).to.eq(expandTo18Decimals(100))
    expect(before.references[1]).to.eq(expandTo18Decimals(2137))

    await token1.transfer(pair.address, inputAmount, overrides)
    await pair.swap(expectedOutputAmount, 0, wallet.address, overrides)

    const inputAmount2 = expandTo18Decimals(100)
    const expectedOutputAmount2 = expandTo18Decimals('0.262679408643924126')

    expect(await pair.getSwapAmount0Out(inputAmount2)).to.eq(expectedOutputAmount2)

    const after = await getState()
    expect(after.reserves[0]).to.eq(expandTo18Decimals('99.737320537873101360'))
    expect(after.reserves[1]).to.eq(expandTo18Decimals(2236.7))
    expect(after.references[0]).to.eq(expandTo18Decimals(100))
    expect(after.references[1]).to.eq(expandTo18Decimals(2137))
  })
})
