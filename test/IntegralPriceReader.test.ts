import { expect } from 'chai'
import { setupFixtureLoader } from './shared/setup'
import { priceReaderV2Fixture, priceReaderV3Fixture } from './shared/fixtures'
import { BigNumber, constants } from 'ethers'

const BN_NORMALIZER = BigNumber.from(10).pow(18)

describe('IntegralPriceReader', () => {
  const loadFixture = setupFixtureLoader()

  it('initialized with factory and owner', async () => {
    const { wallet, priceReader, factory } = await loadFixture(priceReaderV2Fixture)
    expect(await priceReader.factory()).to.eq(factory.address)
    expect(await priceReader.owner()).to.eq(wallet.address)
  })

  describe('setOwner', () => {
    it('sets new owner', async () => {
      const { priceReader, other } = await loadFixture(priceReaderV2Fixture)
      await expect(priceReader.setOwner(other.address)).to.emit(priceReader, 'OwnerSet').withArgs(other.address)
      expect(await priceReader.owner()).to.be.eq(other.address)
    })

    it('sets new owner from non owner', async () => {
      const { priceReader, other } = await loadFixture(priceReaderV2Fixture)
      await expect(priceReader.connect(other).setOwner(other.address)).to.be.revertedWith('PR_FORBIDDEN')
    })
  })

  describe('getOracle', () => {
    it('getOracle token address zero', async () => {
      const { priceReader, token0 } = await loadFixture(priceReaderV2Fixture)
      await expect(priceReader.getOracle(token0.address, constants.AddressZero)).to.be.revertedWith('PR_INVALID_TOKEN')
    })

    it('invalid pair', async () => {
      const { priceReader, wallet, other } = await loadFixture(priceReaderV2Fixture)
      await expect(priceReader.getOracle(wallet.address, other.address)).to.be.revertedWith('PR_PAIR_NOT_FOUND')
    })

    it('returns oracle', async () => {
      const { priceReader, token0, token1, oracle } = await loadFixture(priceReaderV2Fixture)
      expect(await priceReader.getOracle(token0.address, token1.address)).to.eq(oracle.address)
    })
  })

  describe('isOracleV3', () => {
    it('zero address', async () => {
      const { priceReader } = await loadFixture(priceReaderV3Fixture)
      await expect(priceReader.setOracleV3(constants.AddressZero, true)).to.be.revertedWith('PR_INVALID_ORACLE')
    })

    it('sets oracle v3', async () => {
      const { priceReader, oracleNotSet } = await loadFixture(priceReaderV3Fixture)
      expect(await priceReader.isOracleV3(oracleNotSet.address)).to.be.false
      await priceReader.setOracleV3(oracleNotSet.address, true)
      expect(await priceReader.isOracleV3(oracleNotSet.address)).to.be.true
    })

    it('sets oracle v3 from non owner', async () => {
      const { priceReader, oracleNotSet, other } = await loadFixture(priceReaderV3Fixture)
      await expect(priceReader.connect(other).setOracleV3(oracleNotSet.address, true)).to.be.revertedWith(
        'PR_FORBIDDEN'
      )
    })

    it('oracle v2', async () => {
      const { priceReader, oracle } = await loadFixture(priceReaderV2Fixture)
      expect(await priceReader.isOracleV3(oracle.address)).to.be.false
    })

    it('oracle v3', async () => {
      const { priceReader, oracle } = await loadFixture(priceReaderV3Fixture)
      expect(await priceReader.isOracleV3(oracle.address)).to.be.true
    })
  })

  describe('getPrice', () => {
    it('getPrice uniswapV2Pair address zero', async () => {
      const { priceReader, token2, token3 } = await loadFixture(priceReaderV2Fixture)
      await expect(priceReader.getPrice(token2.address, token3.address)).to.be.revertedWith('PR_INVALID_UN_PAIR')
    })

    it('getPrice uniswapV3Pair address zero', async () => {
      const { priceReader, token2, token3 } = await loadFixture(priceReaderV3Fixture)
      await expect(priceReader.getPrice(token2.address, token3.address)).to.be.revertedWith('PR_INVALID_UNV3_PAIR')
    })

    it('gets V2 price', async () => {
      const { priceReader, swapOnUniswapPair, uniswapPair01, token0, token1 } = await loadFixture(priceReaderV2Fixture)
      // [100, 400]: initial reserves -> [145, 280]: after swap
      let price = await priceReader.getPrice(token0.address, token1.address)
      expect(price).to.eq(BigNumber.from(280).mul(BN_NORMALIZER).div(145))

      await swapOnUniswapPair(uniswapPair01, 28, token0) // [145, 280] -> [166.75, 252]: after swap
      price = await priceReader.getPrice(token0.address, token1.address)
      expect(price).to.eq(BigNumber.from(25200).mul(BN_NORMALIZER).div(16675))
    })

    it('gets V3 price', async () => {
      const { wallet, priceReader, swapOnUniswap, token0, token1, uniswapPool } = await loadFixture(
        priceReaderV3Fixture
      )
      const price = await priceReader.getPrice(token0.address, token1.address)
      const { sqrtPriceX96 } = await uniswapPool.slot0()
      const spotPrice = sqrtPriceX96.pow(2).mul(BN_NORMALIZER).mul(BigNumber.from(10).pow(12)).shr(192)

      expect(price).to.eq(spotPrice)

      await swapOnUniswap({
        recipient: wallet.address,
        amountIn: BN_NORMALIZER.mul(100),
        amountOutMinimum: 10,
        tokenIn: token0,
        tokenOut: token1,
        fee: 3000,
      })

      const priceAfter = await priceReader.getPrice(token0.address, token1.address)
      const { sqrtPriceX96: sqrtPriceX96After } = await uniswapPool.slot0()
      const spotPriceAfter = sqrtPriceX96After.pow(2).mul(BN_NORMALIZER).mul(BigNumber.from(10).pow(12)).shr(192)
      expect(priceAfter).to.eq(spotPriceAfter)
      expect(priceAfter).to.lt(price) // token0 price should be dropped
    })
  })
})
