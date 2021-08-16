import { setupFixtureLoader } from '../shared/setup'
import { tokenFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { getDelegateDigest, getFutureTime, overrides, signDigest } from '../shared/utilities'

describe('IntegralToken.blacklist', () => {
  const loadFixture = setupFixtureLoader()

  it('can add to blacklist', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    expect(await token.isBlacklisted(other.address)).to.eq(true)
  })

  it('can remove from blacklist', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    await token.setBlacklisted(other.address, false)
    expect(await token.isBlacklisted(other.address)).to.eq(false)
  })

  it('cannot add to blacklist', async () => {
    const { token, other, another } = await loadFixture(tokenFixture)
    await expect(token.connect(other).setBlacklisted(another.address, true)).to.be.revertedWith('IT_FORBIDDEN')
  })

  it('blacklist cannot mint', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await token.setMinter(other.address, true)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).mint(other.address, 1)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot burn', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await token.setBurner(other.address, true)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).burn(1)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot approve', async () => {
    const { token, other, another } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).approve(another.address, 1)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot be approved', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.approve(other.address, 1)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot increase allowance', async () => {
    const { token, other, another } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).increaseAllowance(another.address, 1)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot have allowance increased', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.increaseAllowance(other.address, 1)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot decrease allowance', async () => {
    const { token, other, another } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).decreaseAllowance(another.address, 1)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot have allowance decreased', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.decreaseAllowance(other.address, 1)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot transfer', async () => {
    const { token, other, another } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).transfer(another.address, 1)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot transfer to', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.transfer(other.address, 1)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot transfer from', async () => {
    const { token, other, another } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).transferFrom(other.address, another.address, 1)).to.be.revertedWith(
      'IT_BLACKLISTED'
    )
  })

  it('blacklist cannot transfer from from', async () => {
    const { token, other, another } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.transferFrom(other.address, another.address, 1)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot transfer from to', async () => {
    const { token, other, another } = await loadFixture(tokenFixture)
    await token.setBlacklisted(another.address, true)
    await expect(token.transferFrom(other.address, another.address, 1)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot delegate', async () => {
    const { token, other, another } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.connect(other).delegate(another.address)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot delegate to', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await token.setBlacklisted(other.address, true)
    await expect(token.delegate(other.address)).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot delegate with signature', async () => {
    const { token, other, another } = await loadFixture(tokenFixture)
    const expiry = getFutureTime()
    const digest = await getDelegateDigest(token, another.address, expiry, 0)
    const { v, r, s } = signDigest(other, digest)
    await token.setBlacklisted(other.address, true)
    await expect(
      token.connect(other).delegateWithSignature(another.address, 0, expiry, v, r, s, overrides)
    ).to.be.revertedWith('IT_BLACKLISTED')
  })

  it('blacklist cannot delegate with signature to', async () => {
    const { token, other, wallet } = await loadFixture(tokenFixture)
    const expiry = getFutureTime()
    const digest = await getDelegateDigest(token, other.address, expiry, 0)
    const { v, r, s } = signDigest(wallet, digest)
    await token.setBlacklisted(other.address, true)
    await expect(token.delegateWithSignature(other.address, 0, expiry, v, r, s, overrides)).to.be.revertedWith(
      'IT_BLACKLISTED'
    )
  })
})
