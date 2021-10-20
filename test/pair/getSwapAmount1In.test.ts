import { expect } from 'chai'

import { expandTo18Decimals, overrides } from '../shared/utilities'
import { pairFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralPair.getSwapAmount1In', () => {
  const loadFixture = setupFixtureLoader()

  const testCases = [
    { reserve0: 5, reserve1: 10, price: 2, amount0Out: 1 },
    { reserve0: 10, reserve1: 5, price: 2, amount0Out: 1 },
    { reserve0: 100, reserve1: 5, price: 20, amount0Out: 4 },
    { reserve0: 5, reserve1: 10000, price: 2, amount0Out: 3 },
    { reserve0: 5000, reserve1: 10000, price: 2, amount0Out: 400 },
    { reserve0: 50000, reserve1: 100000, price: 2, amount0Out: 4000 },
    { reserve0: 111111, reserve1: 333333, price: 3, amount0Out: 22222 },
  ]

  for (const { reserve0, reserve1, price, amount0Out } of testCases) {
    it(`reserves=${reserve0}/${reserve1} price=${price} amount0Out=${amount0Out}`, async () => {
      const { addLiquidity, oracle, token0, token1, pair, wallet } = await loadFixture(pairFixture)

      const amountOut = expandTo18Decimals(amount0Out)

      await addLiquidity(expandTo18Decimals(reserve0), expandTo18Decimals(reserve1))
      await oracle.setPrice(expandTo18Decimals(price), overrides)
      await pair.syncWithOracle(overrides)

      const amount1In = await pair.getSwapAmount1In(amountOut)

      const balance0Before = await token0.balanceOf(wallet.address)
      await token1.transfer(pair.address, amount1In, overrides)
      await pair.swap(amountOut, 0, wallet.address, overrides)

      const balance0After = await token0.balanceOf(wallet.address)
      expect(balance0After.sub(balance0Before)).to.eq(amountOut)
    })
  }

  it('returns correct values', async () => {
    const { addLiquidity, oracle, token1, pair, wallet, getState } = await loadFixture(pairFixture)
    await oracle.setPrice(expandTo18Decimals('379.55'), overrides)
    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(2137))

    const outputAmount = expandTo18Decimals(1)
    const expectedInputAmount = expandTo18Decimals('380.692227574777966379')

    expect(await pair.getSwapAmount1In(outputAmount)).to.eq(expectedInputAmount)
    const before = await getState()
    expect(before.reserves[0]).to.eq(expandTo18Decimals(100))
    expect(before.reserves[1]).to.eq(expandTo18Decimals(2137))
    expect(before.references[0]).to.eq(expandTo18Decimals(100))
    expect(before.references[1]).to.eq(expandTo18Decimals(2137))

    await token1.transfer(pair.address, expectedInputAmount, overrides)
    await pair.swap(outputAmount, 0, wallet.address, overrides)

    const outputAmount2 = expandTo18Decimals(1)
    const expectedInputAmount2 = expandTo18Decimals('380.692522653123209209')

    expect(await pair.getSwapAmount1In(outputAmount2)).to.eq(expectedInputAmount2)

    const after = await getState()
    expect(after.reserves[0]).to.eq(expandTo18Decimals('98.999999990000003875'))
    expect(after.reserves[1]).to.eq(expandTo18Decimals('2516.550150892053632480'))
    expect(after.references[0]).to.eq(expandTo18Decimals(100))
    expect(after.references[1]).to.eq(expandTo18Decimals(2137))
  })
})
