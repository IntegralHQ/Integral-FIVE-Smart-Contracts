import { expect } from 'chai'

import { expandTo18Decimals, overrides } from '../shared/utilities'
import {
  pairWithLimitsFixture,
  mixedDecimalsTokenPairFixture,
  pairWithUnitOracleFixture,
  pairFixture,
} from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { BigNumber, constants, utils } from 'ethers'
import { parseUnits } from '@ethersproject/units'
import { getOracleParams } from '../../deploy/tasks/params/getOracleParams'
import { BuyHelper__factory } from '../../build/types'

const WEI_SWAP_DIFFERENCE = 100

describe('IntegralPair.swap', () => {
  const loadFixture = setupFixtureLoader()

  describe('swapping x->y', () => {
    const swapTestCases = [
      // from uniswap
      { amount0: 1, reserve0: 5, reserve1: 10, price: 2 },
      { amount0: 1, reserve0: 10, reserve1: 5, price: 0.5 },
      { amount0: 2, reserve0: 5, reserve1: 10, price: 2 },
      { amount0: 2, reserve0: 10, reserve1: 5, price: 0.5 },
      { amount0: 1, reserve0: 10, reserve1: 10, price: 1 },
      { amount0: 1, reserve0: 100, reserve1: 100, price: 1 },
      { amount0: 1, reserve0: 1000, reserve1: 1000, price: 1 },
      // new test cases
      { amount0: 1, reserve0: 100, reserve1: 200, price: 2 },
      { amount0: 1, reserve0: 100, reserve1: 200, price: 4 },
      { amount0: 10, reserve0: 100, reserve1: 200, price: 4 },
      { amount0: 100, reserve0: 1000, reserve1: 1000, price: 0.01 },
    ]
    for (const { amount0, reserve0, reserve1, price } of swapTestCases) {
      it(`${amount0}, reserves=${reserve0}/${reserve1} price=${price}`, async () => {
        const { addLiquidity, oracle, token0, token1, pair, SWAP_FEE, PRECISION, wallet } = await loadFixture(
          pairWithLimitsFixture
        )

        const xBefore = expandTo18Decimals(reserve0)
        const yBefore = expandTo18Decimals(reserve1)
        await addLiquidity(xBefore, yBefore)

        await oracle.setPrice(expandTo18Decimals(price), overrides)

        await token0.transfer(pair.address, expandTo18Decimals(amount0), overrides)
        const swapFee = expandTo18Decimals(amount0).mul(SWAP_FEE).div(PRECISION)
        const swapAmount = expandTo18Decimals(amount0).sub(swapFee)
        const yAfter = await oracle.tradeX(expandTo18Decimals(reserve0).add(swapAmount), xBefore, yBefore, overrides)
        await expect(
          pair.swap(0, yBefore.sub(yAfter).add(WEI_SWAP_DIFFERENCE), wallet.address, overrides)
        ).to.be.revertedWith('IP_INVALID_SWAP')
        await pair.swap(0, yBefore.sub(yAfter), wallet.address, overrides)

        const [reference0, reference1] = await pair.getReferences()
        expect(reference0).to.eq(expandTo18Decimals(reserve0))
        expect(reference1).to.eq(expandTo18Decimals(reserve1))

        const [fee0, fee1] = await pair.getFees()
        expect(fee0).to.eq(swapFee)
        expect(fee1).to.eq(0)

        const [_reserve0, _reserve1] = await pair.getReserves()
        expect(await token0.balanceOf(pair.address)).to.eq(_reserve0.add(fee0))
        expect(await token1.balanceOf(pair.address)).to.eq(_reserve1.add(fee1))
      })
    }
  })

  describe('swapping y->x', () => {
    const swapTestCases = [
      // from uniswap
      { amount1: 1, reserve0: 5, reserve1: 10, price: 2 },
      { amount1: 1, reserve0: 10, reserve1: 5, price: 0.5 },
      { amount1: 2, reserve0: 5, reserve1: 10, price: 2 },
      { amount1: 2, reserve0: 10, reserve1: 5, price: 0.5 },
      { amount1: 1, reserve0: 10, reserve1: 10, price: 1 },
      { amount1: 1, reserve0: 100, reserve1: 100, price: 1 },
      { amount1: 1, reserve0: 1000, reserve1: 1000, price: 1 },
      // new test cases
      { amount1: 1, reserve0: 100, reserve1: 200, price: 2 },
      { amount1: 1, reserve0: 100, reserve1: 200, price: 4 },
      { amount1: 10, reserve0: 100, reserve1: 200, price: 4 },
      { amount1: 100, reserve0: 1000, reserve1: 1000, price: 100 },
    ]
    for (const { amount1, reserve0, reserve1, price } of swapTestCases) {
      it(`${amount1}, reserves=${reserve0}/${reserve1} price=${price}`, async () => {
        const { addLiquidity, oracle, token1, token0, pair, SWAP_FEE_N, wallet } = await loadFixture(
          pairWithLimitsFixture
        )

        const xBefore = expandTo18Decimals(reserve0)
        const yBefore = expandTo18Decimals(reserve1)
        await addLiquidity(xBefore, yBefore)

        await oracle.setPrice(expandTo18Decimals(price), overrides)

        await token1.transfer(pair.address, expandTo18Decimals(amount1), overrides)
        const xAfter = await oracle.tradeY(
          expandTo18Decimals(reserve1 + amount1 * (1 - SWAP_FEE_N)),
          xBefore,
          yBefore,
          overrides
        )
        await expect(
          pair.swap(xBefore.sub(xAfter).add(WEI_SWAP_DIFFERENCE), 0, wallet.address, overrides)
        ).to.be.revertedWith('IP_INVALID_SWAP')
        await pair.swap(xBefore.sub(xAfter), 0, wallet.address, overrides)

        const [reference0, reference1] = await pair.getReferences()
        expect(reference0).to.eq(expandTo18Decimals(reserve0))
        expect(reference1).to.eq(expandTo18Decimals(reserve1))

        const [fee0, fee1] = await pair.getFees()
        expect(fee0).to.eq(0)
        expect(fee1).to.eq(expandTo18Decimals(amount1 * SWAP_FEE_N))

        const [_reserve0, _reserve1] = await pair.getReserves()
        expect(await token0.balanceOf(pair.address)).to.eq(_reserve0.add(fee0))
        expect(await token1.balanceOf(pair.address)).to.eq(_reserve1.add(fee1))
      })
    }
  })

  it('can swap token0 for token1', async () => {
    const { addLiquidity, oracle, token0, token1, pair, SWAP_FEE_N, wallet } = await loadFixture(pairWithLimitsFixture)

    const token0Amount = expandTo18Decimals(5)
    const token1Amount = expandTo18Decimals(10)
    const price = expandTo18Decimals(2)
    const amount0 = expandTo18Decimals(1)
    const swapFee = expandTo18Decimals(1 * SWAP_FEE_N)
    const effectiveAmount0 = amount0.sub(swapFee)

    await addLiquidity(token0Amount, token1Amount)
    await oracle.setPrice(price, overrides)
    const token1After = await oracle.tradeX(token0Amount.add(effectiveAmount0), token0Amount, token1Amount, overrides)

    const expectedOutputAmount = token1Amount.sub(token1After)
    await token0.transfer(pair.address, amount0, overrides)
    await expect(pair.swap(0, expectedOutputAmount, wallet.address, overrides))
      .to.emit(token1, 'Transfer')
      .withArgs(pair.address, wallet.address, expectedOutputAmount)
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount.add(amount0).sub(swapFee), token1Amount.sub(expectedOutputAmount))
      .to.emit(pair, 'Fees')
      .withArgs(swapFee, 0)
      .to.emit(pair, 'Swap')
      .withArgs(wallet.address, wallet.address)

    const reserves = await pair.getReserves()
    expect(reserves[0]).to.eq(token0Amount.add(amount0).sub(swapFee))
    expect(reserves[1]).to.eq(token1Amount.sub(expectedOutputAmount))
    expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.add(amount0))
    expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.sub(expectedOutputAmount))
    const totalSupplyToken0 = await token0.totalSupply()
    const totalSupplyToken1 = await token1.totalSupply()
    expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(token0Amount).sub(amount0))
    expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(token1Amount).add(expectedOutputAmount))
  })

  it('can swap token1 for token0', async () => {
    const { addLiquidity, oracle, token0, token1, pair, SWAP_FEE_N, wallet } = await loadFixture(pairWithLimitsFixture)

    const token0Amount = expandTo18Decimals(5)
    const token1Amount = expandTo18Decimals(10)
    const price = expandTo18Decimals(2)
    const amount1 = expandTo18Decimals(1)
    const swapFee = expandTo18Decimals(1 * SWAP_FEE_N)
    const effectiveAmount1 = expandTo18Decimals(1).sub(swapFee)

    await addLiquidity(token0Amount, token1Amount)
    await oracle.setPrice(price, overrides)
    const token0After = await oracle.tradeY(token1Amount.add(effectiveAmount1), token0Amount, token1Amount, overrides)

    const expectedOutputAmount = token0Amount.sub(token0After)
    await token1.transfer(pair.address, amount1, overrides)
    await expect(pair.swap(expectedOutputAmount, 0, wallet.address, overrides))
      .to.emit(token0, 'Transfer')
      .withArgs(pair.address, wallet.address, expectedOutputAmount)
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount.sub(expectedOutputAmount), token1Amount.add(amount1).sub(swapFee))
      .to.emit(pair, 'Fees')
      .withArgs(0, swapFee)
      .to.emit(pair, 'Swap')
      .withArgs(wallet.address, wallet.address)

    const reserves = await pair.getReserves()
    expect(reserves[0]).to.eq(token0Amount.sub(expectedOutputAmount))
    expect(reserves[1]).to.eq(token1Amount.add(amount1).sub(swapFee))
    expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.sub(expectedOutputAmount))
    expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.add(amount1))
    const totalSupplyToken0 = await token0.totalSupply()
    const totalSupplyToken1 = await token1.totalSupply()
    expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(token0Amount).add(expectedOutputAmount))
    expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(token1Amount).sub(amount1))
  })

  it('correctly updates references when less token1 is withdrawn', async () => {
    const { addLiquidity, oracle, token0, pair, SWAP_FEE_N, wallet } = await loadFixture(pairWithLimitsFixture)

    const token0Amount = expandTo18Decimals(5)
    const token1Amount = expandTo18Decimals(10)
    const price = expandTo18Decimals(2)
    const amount0 = expandTo18Decimals(1)
    const fee = expandTo18Decimals(1 * SWAP_FEE_N)
    const effectiveAmount0 = amount0.sub(fee)

    await addLiquidity(token0Amount, token1Amount)
    await oracle.setPrice(price, overrides)
    const token1After = await oracle.tradeX(token0Amount.add(effectiveAmount0), token0Amount, token1Amount, overrides)

    const leftInContract = expandTo18Decimals(0.02)

    const expectedOutputAmount = token1Amount.sub(token1After).sub(leftInContract)
    await token0.transfer(pair.address, amount0, overrides)

    const referencesBefore = await pair.getReferences()
    const feesBefore = await pair.getFees()
    await pair.swap(0, expectedOutputAmount, wallet.address, overrides)
    const referencesAfter = await pair.getReferences()
    const feesAfter = await pair.getFees()

    expect(referencesAfter[0].sub(referencesBefore[0])).to.eq(0)
    expect(referencesAfter[1].sub(referencesBefore[1])).to.eq(0)

    expect(feesAfter[0].sub(feesBefore[0])).to.eq(fee)
    expect(feesAfter[1].sub(feesBefore[1])).to.eq(leftInContract)
  })

  it('correctly updates references when less token0 is withdrawn', async () => {
    const { addLiquidity, oracle, token1, pair, SWAP_FEE_N, wallet } = await loadFixture(pairWithLimitsFixture)

    const token0Amount = expandTo18Decimals(5)
    const token1Amount = expandTo18Decimals(10)
    const price = expandTo18Decimals(2)
    const amount1 = expandTo18Decimals(1)
    const fee = expandTo18Decimals(1 * SWAP_FEE_N)
    const effectiveAmount1 = amount1.sub(fee)

    await addLiquidity(token0Amount, token1Amount)
    await oracle.setPrice(price, overrides)
    const token0After = await oracle.tradeY(token1Amount.add(effectiveAmount1), token0Amount, token1Amount, overrides)

    const leftInContract = expandTo18Decimals(0.02)

    const expectedOutputAmount = token0Amount.sub(token0After).sub(leftInContract)
    await token1.transfer(pair.address, amount1, overrides)

    const referencesBefore = await pair.getReferences()
    const feesBefore = await pair.getFees()
    await pair.swap(expectedOutputAmount, 0, wallet.address, overrides)
    const referencesAfter = await pair.getReferences()
    const feesAfter = await pair.getFees()

    expect(referencesAfter[0].sub(referencesBefore[0])).to.eq(0)
    expect(referencesAfter[1].sub(referencesBefore[1])).to.eq(0)

    expect(feesAfter[0].sub(feesBefore[0])).to.eq(leftInContract)
    expect(feesAfter[1].sub(feesBefore[1])).to.eq(fee)
  })

  it('cannot set reserves to zero', async () => {
    const { addLiquidity, token0, pair, wallet } = await loadFixture(pairWithUnitOracleFixture)
    await addLiquidity(BigNumber.from(1_000_000), BigNumber.from(1_000_000))

    await token0.transfer(pair.address, 1_003_009)
    await expect(pair.swap(0, 997_000, wallet.address)).to.be.revertedWith('RS_ZERO')
  })

  it('swap token0 (8 decimals) for token1 (18 decimals) works for tokens with different than 18 decimals', async () => {
    const { addLiquidity, oracle, token0, token1, pair, SWAP_FEE_N, wallet } = await loadFixture(
      mixedDecimalsTokenPairFixture
    )

    const token0Amount = utils.parseUnits('5', 8)
    const token1Amount = expandTo18Decimals(10)
    const price = expandTo18Decimals(2)
    const amount0 = utils.parseUnits('1', 8)
    const swapFee = utils.parseUnits(SWAP_FEE_N.toString(), 8)
    const effectiveAmount0 = amount0.sub(swapFee)

    await addLiquidity(token0Amount, token1Amount)
    await oracle.setPrice(price, overrides)
    const token1After = await oracle.tradeX(token0Amount.add(effectiveAmount0), token0Amount, token1Amount, overrides)

    const expectedOutputAmount = token1Amount.sub(token1After)
    await token0.transfer(pair.address, amount0, overrides)
    await expect(pair.swap(0, expectedOutputAmount, wallet.address, overrides))
      .to.emit(token1, 'Transfer')
      .withArgs(pair.address, wallet.address, expectedOutputAmount)
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount.add(amount0).sub(swapFee), token1Amount.sub(expectedOutputAmount))
      .to.emit(pair, 'Fees')
      .withArgs(swapFee, 0)
      .to.emit(pair, 'Swap')
      .withArgs(wallet.address, wallet.address)

    const reserves = await pair.getReserves()
    expect(reserves[0]).to.eq(token0Amount.add(amount0).sub(swapFee))
    expect(reserves[1]).to.eq(token1Amount.sub(expectedOutputAmount))
    expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.add(amount0))
    expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.sub(expectedOutputAmount))
    const totalSupplyToken0 = await token0.totalSupply()
    const totalSupplyToken1 = await token1.totalSupply()
    expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(token0Amount).sub(amount0))
    expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(token1Amount).add(expectedOutputAmount))
  })

  it('swap token1 (18 decimals) for token0 (8 decimals) works for tokens with different than 18 decimals', async () => {
    const { addLiquidity, oracle, token0, token1, pair, SWAP_FEE_N, wallet } = await loadFixture(
      mixedDecimalsTokenPairFixture
    )

    const token0Amount = utils.parseUnits('5', 8)
    const token1Amount = expandTo18Decimals(10)
    const price = expandTo18Decimals(2)
    const amount1 = utils.parseUnits('1')
    const swapFee = expandTo18Decimals(SWAP_FEE_N)
    const effectiveAmount1 = amount1.sub(swapFee)

    await addLiquidity(token0Amount, token1Amount)
    await oracle.setPrice(price, overrides)
    const token0After = await oracle.tradeY(token1Amount.add(effectiveAmount1), token0Amount, token1Amount, overrides)

    const expectedOutputAmount = token0Amount.sub(token0After)
    await token1.transfer(pair.address, amount1, overrides)
    await expect(pair.swap(expectedOutputAmount, 0, wallet.address, overrides))
      .to.emit(token0, 'Transfer')
      .withArgs(pair.address, wallet.address, expectedOutputAmount)
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount.sub(expectedOutputAmount), token1Amount.add(amount1).sub(swapFee))
      .to.emit(pair, 'Fees')
      .withArgs(0, swapFee)
      .to.emit(pair, 'Swap')
      .withArgs(wallet.address, wallet.address)

    const reserves = await pair.getReserves()
    expect(reserves[0]).to.eq(token0Amount.sub(expectedOutputAmount))
    expect(reserves[1]).to.eq(token1Amount.add(amount1.sub(swapFee)))
    expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.sub(expectedOutputAmount))
    expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.add(amount1))
    const totalSupplyToken0 = await token0.totalSupply()
    const totalSupplyToken1 = await token1.totalSupply()
    expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(token0Amount).add(expectedOutputAmount))
    expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(token1Amount).sub(amount1))
  })

  it('token0 liquidity cannot be drained to zero', async () => {
    const { pair, oracle, token1, addLiquidity, wallet } = await loadFixture(pairWithUnitOracleFixture)

    await addLiquidity(expandTo18Decimals(500), expandTo18Decimals(1000))
    await oracle.updateEpoch(overrides)

    const swapOutput = expandTo18Decimals(500)
    const swapInput = await pair.getSwapAmount1In(swapOutput)
    await token1.transfer(pair.address, swapInput, overrides)
    await expect(pair.swap(swapOutput, 0, wallet.address, overrides)).to.be.revertedWith('IP_INSUFFICIENT_LIQUIDITY')
  })

  it('token1 liquidity cannot be drained to zero', async () => {
    const { pair, oracle, token0, addLiquidity, wallet } = await loadFixture(pairWithUnitOracleFixture)

    await addLiquidity(expandTo18Decimals(1000), expandTo18Decimals(500))
    await oracle.updateEpoch(overrides)

    const swapOutput = expandTo18Decimals(500)
    const swapInput = await pair.getSwapAmount0In(swapOutput)
    await token0.transfer(pair.address, swapInput, overrides)
    await expect(pair.swap(0, swapOutput, wallet.address, overrides)).to.be.revertedWith('IP_INSUFFICIENT_LIQUIDITY')
  })

  it('reverts if to is zero', async () => {
    const { pair } = await loadFixture(pairFixture)
    await expect(pair.swap(expandTo18Decimals(1), expandTo18Decimals(2), constants.AddressZero)).to.revertedWith(
      'IP_ADDRESS_ZERO'
    )
  })

  it('checks weth-dai specific price issue', async () => {
    const { pair, oracle, token0, token1, factory, addLiquidity, wallet, other } = await loadFixture(pairFixture)
    const buyHelper = await new BuyHelper__factory(wallet).deploy(overrides)

    // token0: DAI, token1: WETH

    const reserve0 = BigNumber.from('44547107558096886868242274')
    const reserve1 = BigNumber.from('27685936267870034790868')

    const amount0Out = parseUnits('1000')
    const amount1Out = '0'

    await oracle.setParameters(...getOracleParams('weth-dai', 'DAI'), overrides)
    await oracle.setPrice('545609375715524', overrides)
    await factory.setOracle(token0.address, token1.address, oracle.address, overrides)

    await addLiquidity(reserve0, reserve1)

    const amountIn = await buyHelper.getSwapAmount1In(pair.address, amount0Out)
    await token1.transfer(pair.address, amountIn, overrides)
    await expect(pair.connect(other).swap(amount0Out, amount1Out, wallet.address, overrides))
      .to.emit(pair, 'Swap')
      .withArgs(other.address, wallet.address)
  })
})
