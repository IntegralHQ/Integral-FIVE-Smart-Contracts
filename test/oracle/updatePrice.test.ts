import { expect } from 'chai'
import { getOracleWithUniswapFixtureFor, oracleWithUniswapFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, expandToDecimals, overrides } from '../shared/utilities'

describe('IntegralOracle.updatePrice', () => {
  const loadFixture = setupFixtureLoader()

  const configurations = [
    [1000, 20, 18, 18],
    [1000, 20, 10, 10],
    [1000, 20, 18, 10],
    [1000, 20, 10, 18],
  ]

  for (const [a, b, xDecimals, yDecimals] of configurations) {
    const fixture = getOracleWithUniswapFixtureFor(xDecimals, yDecimals)
    const permutations = [
      [a, b],
      [b, a],
    ]
    for (const [xSupply, ySupply] of permutations) {
      it(`price for ${xSupply}e${xDecimals}, ${ySupply}e${yDecimals}`, async () => {
        const { pair, addLiquidity, oracle, provider } = await loadFixture(fixture)

        await addLiquidity(expandToDecimals(xSupply, xDecimals), expandToDecimals(ySupply, yDecimals))
        await provider.send('evm_increaseTime', [1])
        await pair.sync()

        await oracle.setUniswapPair(pair.address)
        await oracle.updatePrice(overrides)
        await provider.send('evm_increaseTime', [1000000])
        await oracle.updatePrice(overrides)

        const price = await oracle.price()
        const expected = expandTo18Decimals(ySupply / xSupply)
        // This can never be exact, because of the UQ112x112 number format. See this link:
        // https://www.wolframalpha.com/input/?i=floor%2820e18*2%5E112%2F1000e18%29%2F2%5E112
        expect(price).to.be.gt(expected.sub(10))
        expect(price).to.be.lt(expected.add(10))
      })
    }
  }

  it('changes each 5 minutes', async () => {
    const { pair, addLiquidity, oracle, provider, wallet, token1 } = await loadFixture(oracleWithUniswapFixture)
    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(50_000))
    await provider.send('evm_increaseTime', [1])
    await pair.sync()

    await oracle.setUniswapPair(pair.address)
    await oracle.updatePrice(overrides)
    const price = await oracle.price()

    await provider.send('evm_increaseTime', [1])
    await token1.transfer(pair.address, expandTo18Decimals(500))
    await pair.swap(expandTo18Decimals(0.8), 0, wallet.address, [])

    await oracle.updatePrice(overrides)
    const price2 = await oracle.price()
    expect(price).to.eq(price2)

    await provider.send('evm_increaseTime', [5 * 60])

    await oracle.updatePrice(overrides)
    const price3 = await oracle.price()
    expect(price).not.to.eq(price3)
  })
})
