import { expect } from 'chai'
import { pointsTokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralPointsToken.blacklist', () => {
  const loadFixture = setupFixtureLoader()

  it('owner can add to blacklist', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.setBlacklisted(other.address, true)
    expect(await token.isBlacklisted(other.address)).to.eq(true)
  })

  it('owner can remove from blacklist', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.setBlacklisted(other.address, true)
    expect(await token.isBlacklisted(other.address)).to.eq(true)
    await token.setBlacklisted(other.address, false)
    expect(await token.isBlacklisted(other.address)).to.eq(false)
  })

  it('users cannot add to blacklist', async () => {
    const { token, other, another } = await loadFixture(pointsTokenFixture)
    await expect(token.connect(other).setBlacklisted(another.address, true)).to.be.revertedWith('IP_FORBIDDEN')
  })

  it('blacklisted users cannot mint', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.setMinter(other.address, true)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).mint(other.address, 1)).to.be.revertedWith('IP_BLACKLISTED')
  })

  it('blacklisted users cannot burn', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.setBurner(other.address, true)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).burn(1)).to.be.revertedWith('IP_BLACKLISTED')
  })

  it('blacklisted users cannot approve', async () => {
    const { token, other, another } = await loadFixture(pointsTokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).approve(another.address, 1)).to.be.revertedWith('IP_BLACKLISTED')
  })

  it('blacklisted users cannot be approved', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.approve(other.address, 1)).to.be.revertedWith('IP_BLACKLISTED')
  })

  it('blacklisted users cannot increase allowance', async () => {
    const { token, other, another } = await loadFixture(pointsTokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).increaseAllowance(another.address, 1)).to.be.revertedWith('IP_BLACKLISTED')
  })

  it('blacklisted users cannot have allowance increased', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.increaseAllowance(other.address, 1)).to.be.revertedWith('IP_BLACKLISTED')
  })

  it('blacklisted users cannot decrease allowance', async () => {
    const { token, other, another } = await loadFixture(pointsTokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).decreaseAllowance(another.address, 1)).to.be.revertedWith('IP_BLACKLISTED')
  })

  it('blacklisted users cannot have allowance decreased', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.decreaseAllowance(other.address, 1)).to.be.revertedWith('IP_BLACKLISTED')
  })

  it('blacklisted users cannot transfer', async () => {
    const { token, other, another } = await loadFixture(pointsTokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).transfer(another.address, 1)).to.be.revertedWith('IP_BLACKLISTED')
  })

  it('blacklisted users cannot be transferred to', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.transfer(other.address, 1)).to.be.revertedWith('IP_BLACKLISTED')
  })

  it('blacklisted users cannot call transferFrom', async () => {
    const { token, other, another } = await loadFixture(pointsTokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).transferFrom(other.address, another.address, 1)).to.be.revertedWith(
      'IP_BLACKLISTED'
    )
  })

  it('blacklisted users cannot be the `from` address in transferFrom', async () => {
    const { token, other, another } = await loadFixture(pointsTokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.transferFrom(other.address, another.address, 1)).to.be.revertedWith('IP_BLACKLISTED')
  })

  it('blacklisted users cannot be the `to` address in transferFrom', async () => {
    const { token, other, another } = await loadFixture(pointsTokenFixture)
    await token.setBlacklisted(another.address, true)
    await expect(token.transferFrom(other.address, another.address, 1)).to.be.revertedWith('IP_BLACKLISTED')
  })
})
