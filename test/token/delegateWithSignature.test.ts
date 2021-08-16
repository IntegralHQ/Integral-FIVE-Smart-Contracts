import { expect } from 'chai'
import { tokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { constants, utils } from 'ethers'
import { getDelegateDigest, getFutureTime, overrides, signDigest } from '../shared/utilities'

const RANDOM_BYTES = utils.randomBytes(32)

describe('IntegralToken.delegateWithSignature', () => {
  const loadFixture = setupFixtureLoader()

  it('expired', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await expect(token.delegateWithSignature(other.address, 1, 0, 1, RANDOM_BYTES, RANDOM_BYTES)).to.be.revertedWith(
      'IT_SIGNATURE_EXPIRED'
    )
  })

  it('invalid signature', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await expect(
      token.delegateWithSignature(other.address, 1, getFutureTime(), 1, RANDOM_BYTES, RANDOM_BYTES)
    ).to.be.revertedWith('IT_INVALID_SIGNATURE')
  })

  it('invalid nonce', async () => {
    const { token, other, wallet } = await loadFixture(tokenFixture)
    const expiry = getFutureTime()
    const digest = await getDelegateDigest(token, other.address, expiry, 0)
    const signature = signDigest(wallet, digest)
    await token.delegateWithSignature(other.address, 0, expiry, signature.v, signature.r, signature.s, overrides)

    const anotherDigest = await getDelegateDigest(token, other.address, expiry, 0)
    const anotherSignature = signDigest(wallet, anotherDigest)
    await expect(
      token.delegateWithSignature(
        other.address,
        0,
        expiry,
        anotherSignature.v,
        anotherSignature.r,
        anotherSignature.s,
        overrides
      )
    ).to.be.revertedWith('IT_INVALID_NONCE')
  })

  it('delegates to address zero', async () => {
    const { token, wallet } = await loadFixture(tokenFixture)
    const expiry = getFutureTime()
    const digest = await getDelegateDigest(token, constants.AddressZero, expiry, 0)
    const { v, r, s } = signDigest(wallet, digest)

    await expect(token.delegateWithSignature(constants.AddressZero, 0, expiry, v, r, s, overrides)).to.be.revertedWith(
      'IT_INVALID_DELEGATE'
    )
  })

  it('delegates to other address', async () => {
    const { token, other, wallet } = await loadFixture(tokenFixture)
    const expiry = getFutureTime()
    const digest = await getDelegateDigest(token, other.address, expiry, 0)
    const { v, r, s } = signDigest(wallet, digest)
    await token.delegateWithSignature(other.address, 0, expiry, v, r, s, overrides)
    expect(await token.getDelegate(wallet.address)).to.eq(other.address)
  })

  it('cannot use the same signature twice', async () => {
    const { token, other, another, wallet } = await loadFixture(tokenFixture)
    const expiry = getFutureTime()
    const digest = await getDelegateDigest(token, other.address, expiry, 0)
    const { v, r, s } = signDigest(wallet, digest)
    await token.delegateWithSignature(other.address, 0, expiry, v, r, s, overrides)
    await token.delegateWithSignature(another.address, 0, expiry, v, r, s, overrides)

    expect(await token.getDelegate(wallet.address)).to.eq(other.address)
  })

  it('can delegate votes twice', async () => {
    const { token, other, another, wallet } = await loadFixture(tokenFixture)
    const expiry = getFutureTime()

    const otherDigest = await getDelegateDigest(token, other.address, expiry, 0)
    const otherSignature = signDigest(wallet, otherDigest)
    await token.delegateWithSignature(
      other.address,
      0,
      expiry,
      otherSignature.v,
      otherSignature.r,
      otherSignature.s,
      overrides
    )

    const anotherDigest = await getDelegateDigest(token, another.address, expiry, 1)
    const anotherSignature = signDigest(wallet, anotherDigest)
    await token.delegateWithSignature(
      another.address,
      1,
      expiry,
      anotherSignature.v,
      anotherSignature.r,
      anotherSignature.s,
      overrides
    )

    expect(await token.getDelegate(wallet.address)).to.eq(another.address)
  })
})
