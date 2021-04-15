import { expect } from 'chai'

import { overrides } from '../shared/utilities'
import { pairFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { constants } from 'ethers'

describe('IntegralPair.setOracle', () => {
  const loadFixture = setupFixtureLoader()

  it('can only be called by the factory', async () => {
    const { pair, other } = await loadFixture(pairFixture)
    await expect(pair.setSwapFee(other.address)).to.be.revertedWith('IP_FORBIDDEN')
  })

  it('resets the references and epoch', async () => {
    const { factory, pair, token0, token1, getAnotherOracle } = await loadFixture(pairFixture)
    const { otherOracle } = await getAnotherOracle()

    await pair.syncWithOracle()
    await expect(factory.setOracle(token0.address, token1.address, otherOracle.address, overrides))
      .to.emit(pair, 'SetOracle')
      .withArgs(otherOracle.address)
    expect(await pair.oracle()).to.eq(otherOracle.address)
    const [reserve0, reserve1] = await pair.getReserves()
    expect(await pair.getReferences()).to.deep.eq([reserve0, reserve1, 0])
  })

  it('reverts if oracle is zero', async () => {
    const { factory, token0, token1 } = await loadFixture(pairFixture)
    await expect(factory.setOracle(token0.address, token1.address, constants.AddressZero)).to.revertedWith(
      'IP_ADDRESS_ZERO'
    )
  })

  it('reverts if oracle is not a contract', async () => {
    const { factory, token0, token1, other } = await loadFixture(pairFixture)
    await expect(factory.setOracle(token0.address, token1.address, other.address)).to.revertedWith(
      'IP_ORACLE_MUST_BE_CONTRACT'
    )
  })
})
