import { expect } from 'chai'
import { constants } from 'ethers'

import { overrides } from '../shared/utilities'
import { pairFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralPair.setTrader', () => {
  const loadFixture = setupFixtureLoader()

  it('can only be called by the factory', async () => {
    const { pair, other } = await loadFixture(pairFixture)
    await expect(pair.setTrader(other.address, overrides)).to.be.revertedWith('IP_FORBIDDEN')
  })

  it('does not allow anyone to trade when set to 0', async () => {
    const { pair, other, factory, token0, token1 } = await loadFixture(pairFixture)
    await factory.setTrader(token0.address, token1.address, constants.AddressZero)
    await expect(pair.mint(other.address)).to.be.revertedWith('IP_UNAUTHORIZED_TRADER')
    await expect(pair.burn(other.address)).to.be.revertedWith('IP_UNAUTHORIZED_TRADER')
    await expect(pair.swap(0, 1, other.address)).to.be.revertedWith('IP_UNAUTHORIZED_TRADER')
  })

  it('allows anyone to trade when set to -1', async () => {
    const { pair, wallet, other, factory, token0, token1 } = await loadFixture(pairFixture)

    await expect(factory.setTrader(token0.address, token1.address, `0x${'f'.repeat(40)}`)).to.emit(pair, 'SetTrader')
    // .withArgs(`0x${'f'.repeat(40)}`) doesn't work as arg has both 'f' and 'F' characters

    await expect(pair.connect(wallet).mint(other.address)).not.to.be.revertedWith('IP_UNAUTHORIZED_TRADER')
    await expect(pair.connect(wallet).burn(other.address)).not.to.be.revertedWith('IP_UNAUTHORIZED_TRADER')
    await expect(pair.connect(wallet).swap(0, 1, other.address)).not.to.be.revertedWith('IP_UNAUTHORIZED_TRADER')

    await expect(pair.connect(other).mint(other.address)).not.to.be.revertedWith('IP_UNAUTHORIZED_TRADER')
    await expect(pair.connect(other).burn(other.address)).not.to.be.revertedWith('IP_UNAUTHORIZED_TRADER')
    await expect(pair.connect(other).swap(0, 1, other.address)).not.to.be.revertedWith('IP_UNAUTHORIZED_TRADER')
  })

  it('allows a specific address to trade when set to it', async () => {
    const { pair, wallet, other, factory, token0, token1 } = await loadFixture(pairFixture)
    await expect(factory.setTrader(token0.address, token1.address, other.address))
      .to.emit(pair, 'SetTrader')
      .withArgs(other.address)

    await expect(pair.connect(wallet).mint(other.address)).to.be.revertedWith('IP_UNAUTHORIZED_TRADER')
    await expect(pair.connect(wallet).burn(other.address)).to.be.revertedWith('IP_UNAUTHORIZED_TRADER')
    await expect(pair.connect(wallet).swap(0, 1, other.address)).to.be.revertedWith('IP_UNAUTHORIZED_TRADER')

    await expect(pair.connect(other).mint(other.address)).not.to.be.revertedWith('IP_UNAUTHORIZED_TRADER')
    await expect(pair.connect(other).burn(other.address)).not.to.be.revertedWith('IP_UNAUTHORIZED_TRADER')
    await expect(pair.connect(other).swap(0, 1, other.address)).not.to.be.revertedWith('IP_UNAUTHORIZED_TRADER')
  })
})
