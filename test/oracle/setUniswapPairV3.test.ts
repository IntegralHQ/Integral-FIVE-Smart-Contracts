import { expect } from 'chai'

import { setupFixtureLoader } from '../shared/setup'
import { overrides } from '../shared/utilities'
import { constants } from 'ethers'
import { getAddress } from 'ethers/lib/utils'
import { oracleV3Fixture } from '../shared/fixtures/oracleV3Fixture'
import { getV3FixtureFor } from '../shared/fixtures/getV3FixtureFor'
import { FeeAmount } from '../shared/uniswapV3Utilities'

describe('IntegralOracleV3.setUniswapPair', () => {
  const loadFixture = setupFixtureLoader()

  it('performs security checkings', async () => {
    const { oracle, other, getEmptyPool, getInvalidDecimalsPool } = await loadFixture(oracleV3Fixture)
    await expect(oracle.connect(other).setUniswapPair(other.address)).to.be.revertedWith('IO_FORBIDDEN')
    await expect(oracle.setUniswapPair(constants.AddressZero)).to.be.revertedWith('IO_ADDRESS_ZERO')
    await expect(oracle.setUniswapPair(other.address)).to.be.revertedWith('IO_UNISWAP_PAIR_MUST_BE_CONTRACT')
    await expect(oracle.setUniswapPair((await getEmptyPool()).address)).to.be.revertedWith('IO_NO_UNISWAP_LIQUIDITY')
    await expect(oracle.setUniswapPair((await getInvalidDecimalsPool()).address)).to.be.revertedWith(
      'IO_INVALID_DECIMALS'
    )
  })

  it('can be changed', async () => {
    const { oracle, uniswapV3Pool, token0, token1, provider } = await loadFixture(
      getV3FixtureFor(6, 18, FeeAmount.MEDIUM, 2100)
    )

    const tx = await oracle.setUniswapPair(uniswapV3Pool.address, overrides)
    const blockTimestamp = (await provider.getBlock((await tx.wait()).blockHash)).timestamp

    await expect(Promise.resolve(tx)).to.emit(oracle, 'UniswapPairSet').withArgs(uniswapV3Pool.address)

    expect(await oracle.uniswapPair()).to.eq(getAddress(uniswapV3Pool.address))
    expect(await oracle.token0()).to.eq(getAddress(token0.address))
    expect(await oracle.token1()).to.eq(getAddress(token1.address))
    expect(await oracle.blockTimestampLast()).to.eq(blockTimestamp)
  })
})
