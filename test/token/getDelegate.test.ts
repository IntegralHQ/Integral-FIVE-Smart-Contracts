import { expect } from 'chai'
import { tokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { overrides } from '../shared/utilities'

describe('IntegralToken.getDelegate', () => {
  const loadFixture = setupFixtureLoader()

  it('delegate not set', async () => {
    const { token, wallet } = await loadFixture(tokenFixture)
    expect(await token.getDelegate(wallet.address)).to.eq(wallet.address)
  })

  it('delegate set', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    await token.delegate(other.address, overrides)
    expect(await token.getDelegate(wallet.address)).to.eq(other.address)
  })
})
