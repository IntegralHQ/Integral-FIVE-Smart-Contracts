import { expect } from 'chai'
import { getV3FixtureFor } from '../shared/fixtures/getV3FixtureFor'
import { setupFixtureLoader } from '../shared/setup'
import { FeeAmount } from '../shared/uniswapV3Utilities'
import { expandToDecimals, overrides } from '../shared/utilities'

const TWO_MINUTES = 2 * 60

type TestCase = [string, number, number, number, number]

describe('IntegralOracleV3.updatePrice', () => {
  const loadFixture = setupFixtureLoader()

  // simulate stable pools
  const cases: TestCase[] = [
    ['USDC-USDT', 6, 6, FeeAmount.LOW, 1],
    ['DAI-USDC', 18, 6, FeeAmount.LOW, 1],
  ]

  for (const [name, decimalsX, decimalsY, fee, uniswapPrice] of cases) {
    it(`price for ${name} pool`, async () => {
      const { oracle, uniswapV3Pool, other, token0, token1, swapOnUniswap, provider } = await loadFixture(
        getV3FixtureFor(decimalsX, decimalsY, fee, uniswapPrice)
      )

      await oracle.setUniswapPair(uniswapV3Pool.address, overrides)
      await provider.send('evm_increaseTime', [TWO_MINUTES])
      await oracle.updatePrice(overrides)
      const price = await oracle.price()

      // swap on Uniswap pair to change price
      await swapOnUniswap({
        recipient: other.address,
        tokenIn: token1,
        tokenOut: token0,
        amountIn: expandToDecimals(200, await token1.decimals()),
        amountOutMinimum: 0,
        fee,
      })

      await provider.send('evm_increaseTime', [TWO_MINUTES])
      await oracle.updatePrice(overrides)
      const price2 = await oracle.price()

      if (token0.address.toLowerCase() > token1.address.toLowerCase()) {
        expect(price2).to.be.lt(price)
      } else {
        expect(price2).to.be.gt(price)
      }

      // swap back on Uniswap pair to change price
      await swapOnUniswap({
        recipient: other.address,
        tokenIn: token0,
        tokenOut: token1,
        amountIn: await token0.balanceOf(other.address),
        amountOutMinimum: 0,
        fee,
      })

      await provider.send('evm_increaseTime', [TWO_MINUTES])
      await oracle.updatePrice(overrides)
      const price3 = await oracle.price()

      if (token0.address.toLowerCase() > token1.address.toLowerCase()) {
        expect(price3).to.be.gt(price2)
      } else {
        expect(price3).to.be.lt(price2)
      }
    })
  }

  it('changes each 5 minutes', async () => {
    // simulate usdc-weth
    const { oracle, uniswapV3Pool, token0, token1, provider, wallet, swapOnUniswap } = await loadFixture(
      getV3FixtureFor(6, 18, FeeAmount.MEDIUM, 2100)
    )

    await oracle.setUniswapPair(uniswapV3Pool.address, overrides)
    await provider.send('evm_increaseTime', [TWO_MINUTES])
    await oracle.updatePrice(overrides)
    const price = await oracle.price()

    // swap on Uniswap pair to change price
    await swapOnUniswap({
      recipient: wallet.address,
      tokenIn: token1,
      tokenOut: token0,
      amountIn: expandToDecimals(10, await token1.decimals()),
      amountOutMinimum: 0,
      fee: FeeAmount.MEDIUM,
    })

    await oracle.updatePrice(overrides)
    const price2 = await oracle.price()
    expect(price).to.eq(price2)

    await provider.send('evm_increaseTime', [TWO_MINUTES])

    await oracle.updatePrice(overrides)
    const price3 = await oracle.price()
    if (token0.address.toLowerCase() > token1.address.toLowerCase()) {
      expect(price3).to.be.lt(price2)
    } else {
      expect(price3).to.be.gt(price2)
    }
  })

  it('price out of bounds', async () => {
    // simulate usdc-weth
    const { oracle, uniswapV3Pool, provider } = await loadFixture(getV3FixtureFor(6, 18, FeeAmount.MEDIUM, 2100))
    await oracle.setUniswapPair(uniswapV3Pool.address, overrides)
    await provider.send('evm_increaseTime', [TWO_MINUTES])
    await oracle.setPriceBounds(1, 2, overrides)
    await expect(oracle.updatePrice(overrides)).to.be.revertedWith('IO_PRICE_OUT_OF_BOUNDS')
  })
})
