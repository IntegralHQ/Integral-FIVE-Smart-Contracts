import { expect } from 'chai'

import { setupFixtureLoader } from '../shared/setup'
import { oracleFixture } from '../shared/fixtures'
import { overrides } from '../shared/utilities'

describe('IntegralOracle.setOwner', () => {
  const loadFixture = setupFixtureLoader()

  it('is set to the deployer', async () => {
    const { oracle, wallet } = await loadFixture(oracleFixture)
    expect(await oracle.owner()).to.eq(wallet.address)
  })

  it('can be changed', async () => {
    const { oracle, other } = await loadFixture(oracleFixture)
    await expect(oracle.connect(other.address).setOwner(other.address)).to.be.revertedWith('IO_FORBIDDEN')

    await expect(oracle.setOwner(other.address, overrides)).to.emit(oracle, 'OwnerSet').withArgs(other.address)
    expect(await oracle.owner()).to.eq(other.address)
  })
})
