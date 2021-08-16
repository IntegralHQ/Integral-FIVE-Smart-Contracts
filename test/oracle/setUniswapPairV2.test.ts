import { expect } from 'chai'

import { setupFixtureLoader } from '../shared/setup'
import { oracleWithUniswapFixture } from '../shared/fixtures'
import { expandTo18Decimals, overrides } from '../shared/utilities'
import { constants } from 'ethers'

describe('IntegralOracleV2.setUniswapPair', () => {
  const loadFixture = setupFixtureLoader()

  it('performs security checkings', async () => {
    const { pair, oracle, other } = await loadFixture(oracleWithUniswapFixture)
    await expect(oracle.connect(other).setUniswapPair(other.address)).to.be.revertedWith('IO_FORBIDDEN')
    await expect(oracle.setUniswapPair(constants.AddressZero)).to.be.revertedWith('IO_ADDRESS_ZERO')
    await expect(oracle.setUniswapPair(other.address)).to.be.revertedWith('IO_UNISWAP_PAIR_MUST_BE_CONTRACT')
    await expect(oracle.setUniswapPair(pair.address)).to.be.revertedWith('IO_NO_UNISWAP_RESERVES')
  })

  it('can be changed', async () => {
    const { pair, addLiquidity, oracle } = await loadFixture(oracleWithUniswapFixture)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    await expect(oracle.setUniswapPair(pair.address, overrides))
      .to.emit(oracle, 'UniswapPairSet')
      .withArgs(pair.address)

    const [, , blockTimestamp] = await pair.getReserves()
    expect(await oracle.uniswapPair()).to.eq(pair.address)
    expect(await oracle.blockTimestampLast()).to.eq(blockTimestamp)
    expect(await oracle.price0CumulativeLast()).to.eq(await pair.price0CumulativeLast())
  })
})
