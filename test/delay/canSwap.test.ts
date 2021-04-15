import { expect } from 'chai'
import { delayFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { overrides, expandTo18Decimals } from '../shared/utilities'

describe('IntegralDelay.canSwap', () => {
  const loadFixture = setupFixtureLoader()

  it('returns true when ratio did not change and minimum was 0', async () => {
    const { delay, addLiquidity, pair, token0, token1 } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(20), expandTo18Decimals(10))
    await delay.registerPair(token0.address, token1.address)

    expect(await delay.testCanSwap(expandTo18Decimals(2), 0, pair.address, overrides)).to.be.true
  })

  it('returns false when ratio did not change and minimum is not 0', async () => {
    const { delay, addLiquidity, pair, token0, token1 } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(20), expandTo18Decimals(10))
    await delay.registerPair(token0.address, token1.address)

    expect(await delay.testCanSwap(expandTo18Decimals(2), 1, pair.address, overrides)).to.be.false
  })

  it('returns true when ratio change is equal to minRatioChange', async () => {
    const { delay, addLiquidity, pair, token0, token1 } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(20), expandTo18Decimals(10))
    await delay.registerPair(token0.address, token1.address)

    expect(await delay.testCanSwap(expandTo18Decimals(1), 1000, pair.address, overrides)).to.be.true
  })

  it('returns true when ratio change is more than minRatioChange', async () => {
    const { delay, addLiquidity, pair, token0, token1 } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(20), expandTo18Decimals(10))
    await delay.registerPair(token0.address, token1.address)

    expect(await delay.testCanSwap(expandTo18Decimals(1), 200, pair.address, overrides)).to.be.true
  })

  it('returns false when ratio change is less than minRatioChange', async () => {
    const { delay, addLiquidity, pair, token0, token1 } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(20), expandTo18Decimals(10))
    await delay.registerPair(token0.address, token1.address)

    expect(await delay.testCanSwap(expandTo18Decimals(1), 2000, pair.address, overrides)).to.be.false
  })
})
