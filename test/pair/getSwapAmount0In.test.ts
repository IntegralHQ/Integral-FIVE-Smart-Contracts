import { expect } from 'chai'

import { expandTo18Decimals, overrides } from '../shared/utilities'
import { pairFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralPair.getSwapAmount0In', () => {
  const loadFixture = setupFixtureLoader()

  const testCases = [
    { reserve0: 5, reserve1: 10, price: 2, amount1Out: 1 },
    { reserve0: 10, reserve1: 5, price: 2, amount1Out: 1 },
    { reserve0: 100, reserve1: 5, price: 20, amount1Out: 4 },
    { reserve0: 5, reserve1: 10000, price: 2, amount1Out: 3 },
    { reserve0: 5000, reserve1: 10000, price: 2, amount1Out: 400 },
    { reserve0: 50000, reserve1: 100000, price: 2, amount1Out: 4000 },
    { reserve0: 111111, reserve1: 333333, price: 3, amount1Out: 222222 },
  ]

  for (const { reserve0, reserve1, price, amount1Out } of testCases) {
    it(`reserves=${reserve0}/${reserve1} price=${price} amount1Out=${amount1Out}`, async () => {
      const { addLiquidity, oracle, token0, token1, pair, wallet } = await loadFixture(pairFixture)

      const amountOut = expandTo18Decimals(amount1Out)

      await addLiquidity(expandTo18Decimals(reserve0), expandTo18Decimals(reserve1))
      await oracle.setPrice(expandTo18Decimals(price), overrides)
      await pair.syncWithOracle()

      const amount0In = await pair.getSwapAmount0In(amountOut)

      const balance1Before = await token1.balanceOf(wallet.address)
      await token0.transfer(pair.address, amount0In, overrides)
      await pair.swap(0, amountOut, wallet.address, overrides)

      const balance1After = await token1.balanceOf(wallet.address)
      expect(balance1After.sub(balance1Before)).to.eq(amountOut)
    })
  }

  it('returns correct values', async () => {
    const { addLiquidity, oracle, token0, pair, wallet, getState } = await loadFixture(pairFixture)
    await oracle.setPrice(expandTo18Decimals('379.55'), overrides)
    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(2137))

    const outputAmount = expandTo18Decimals(100)
    const expectedInputAmount = expandTo18Decimals('0.264262712777733519')

    expect(await pair.getSwapAmount0In(outputAmount)).to.eq(expectedInputAmount)
    const before = await getState()
    expect(before.reserves[0]).to.eq(expandTo18Decimals(100))
    expect(before.reserves[1]).to.eq(expandTo18Decimals(2137))
    expect(before.references[0]).to.eq(expandTo18Decimals(100))
    expect(before.references[1]).to.eq(expandTo18Decimals(2137))

    await token0.transfer(pair.address, expectedInputAmount)
    await pair.swap(0, outputAmount, wallet.address, overrides)

    const outputAmount2 = expandTo18Decimals(100)
    const expectedInputAmount2 = expandTo18Decimals('0.264262759800031899')

    expect(await pair.getSwapAmount0In(outputAmount2)).to.eq(expectedInputAmount2)

    const after = await getState()
    expect(after.reserves[0]).to.eq(expandTo18Decimals('100.263469924639400319'))
    expect(after.reserves[1]).to.eq(expandTo18Decimals('2036.999998999998765552'))
    expect(after.references[0]).to.eq(expandTo18Decimals(100))
    expect(after.references[1]).to.eq(expandTo18Decimals(2137))
  })
})
