import { expect } from 'chai'

import { setupFixtureLoader } from '../shared/setup'
import { oracleFixture } from '../shared/fixtures'

import { IntegralOracle__factory } from '../../build/types'
import { overrides } from '../shared/utilities'

describe('IntegralOracle.constructor', () => {
  const loadFixture = setupFixtureLoader()

  it('deployment fails if decimals higher than 100', async () => {
    const { wallet } = await loadFixture(oracleFixture)

    await expect(new IntegralOracle__factory(wallet).deploy(101, 101, overrides)).to.be.revertedWith(
      'IO_DECIMALS_HIGHER_THAN_100'
    )
    await expect(new IntegralOracle__factory(wallet).deploy(101, 18, overrides)).to.be.revertedWith(
      'IO_DECIMALS_HIGHER_THAN_100'
    )
    await expect(new IntegralOracle__factory(wallet).deploy(18, 101, overrides)).to.be.revertedWith(
      'IO_DECIMALS_HIGHER_THAN_100'
    )
  })
})
