import { expect } from 'chai'

import { expandTo18Decimals, overrides } from '../shared/utilities'
import { pairFixture, pairWithUnitOracleFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { constants } from 'ethers'

describe('IntegralPair.collect', () => {
  const loadFixture = setupFixtureLoader()

  it('can only be called by the factory', async () => {
    const { pair, wallet } = await loadFixture(pairFixture)
    await expect(pair.collect(wallet.address)).to.be.revertedWith('IP_FORBIDDEN')
  })

  it('clears the fees and correctly calculates references', async () => {
    const { token0, token1, pair, addLiquidity, oracle, factory, getState, PRECISION, wallet } = await loadFixture(
      pairWithUnitOracleFixture
    )

    const token0Amount = expandTo18Decimals(500)
    const token1Amount = expandTo18Decimals(500)
    await addLiquidity(token0Amount, token1Amount)

    const swapFee = expandTo18Decimals(0.5)
    await factory.setSwapFee(token0.address, token1.address, swapFee)

    await oracle.updateEpoch()

    const amountIn = expandTo18Decimals(1)
    await token1.transfer(pair.address, amountIn)
    const amountOut = await pair.getSwapAmount0Out(amountIn)
    const swapFeeAmount = amountIn.mul(swapFee).div(PRECISION)

    await pair.swap(amountOut, 0, wallet.address, overrides)

    const stateBefore = await getState()
    await factory.collect(token0.address, token1.address, wallet.address, { ...overrides, gasPrice: 0 })
    const stateAfter = await getState()

    expect(stateAfter.walletToken0Balance.sub(stateBefore.walletToken0Balance)).to.eq(0)
    expect(stateAfter.walletToken1Balance.sub(stateBefore.walletToken1Balance)).to.eq(swapFeeAmount)

    expect(stateBefore.fees[0].sub(stateAfter.fees[0])).to.eq(0)
    expect(stateBefore.fees[1].sub(stateAfter.fees[1])).to.eq(swapFeeAmount)
  })

  it('reverts if to is zero', async () => {
    const { factory, token0, token1 } = await loadFixture(pairFixture)
    await expect(factory.collect(token0.address, token1.address, constants.AddressZero)).to.revertedWith(
      'IP_ADDRESS_ZERO'
    )
  })
})
