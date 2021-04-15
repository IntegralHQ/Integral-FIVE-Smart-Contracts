import { expect } from 'chai'
import { setupFixtureLoader } from '../shared/setup'
import { pairWithUnitOracleFixture } from '../shared/fixtures'
import { expandTo18Decimals, overrides } from '../shared/utilities'

describe('IntegralPair.setToken1AbsoluteLimit', () => {
  const loadFixture = setupFixtureLoader()

  it('can only be called by factory', async () => {
    const { pair } = await loadFixture(pairWithUnitOracleFixture)
    await expect(pair.setToken1AbsoluteLimit(100)).to.be.revertedWith('IP_FORBIDDEN')
  })

  it('fails if limit is exceeded', async () => {
    const { pair, token1, token0, addLiquidity, factory, wallet } = await loadFixture(pairWithUnitOracleFixture)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    await expect(factory.setToken1AbsoluteLimit(token1.address, token0.address, expandTo18Decimals(50)))
      .to.emit(pair, 'SetToken1AbsoluteLimit')
      .withArgs(expandTo18Decimals(50))

    const swapAmount1Out = expandTo18Decimals(30)
    const swapAmount0In = await pair.getSwapAmount0In(swapAmount1Out)
    await token0.transfer(pair.address, swapAmount0In)
    await pair.swap(0, swapAmount1Out, wallet.address, overrides)
    await token0.transfer(pair.address, swapAmount0In)

    await expect(pair.swap(0, swapAmount1Out, wallet.address, overrides)).to.be.revertedWith(
      'IP_A1_LIQUIDITY_LIMIT_EXCEEDED'
    )
  })

  it('handles subtraction edge case', async () => {
    const { pair, token1, token0, addLiquidity, factory, wallet } = await loadFixture(pairWithUnitOracleFixture)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    await expect(factory.setToken1AbsoluteLimit(token1.address, token0.address, expandTo18Decimals(50)))
      .to.emit(pair, 'SetToken1AbsoluteLimit')
      .withArgs(expandTo18Decimals(50))

    const swapAmount0Out = expandTo18Decimals(30)
    const swapAmount1In = await pair.getSwapAmount1In(swapAmount0Out)
    await token1.transfer(pair.address, swapAmount1In)
    await pair.swap(swapAmount0Out, 0, wallet.address, overrides)

    // take out less
    const swapAmount1Out = swapAmount1In.sub(expandTo18Decimals(5))
    const swapAmount0In = await pair.getSwapAmount0In(swapAmount1Out)
    await token0.transfer(pair.address, swapAmount0In)
    await pair.swap(0, swapAmount1Out, wallet.address, overrides)
  })
})
