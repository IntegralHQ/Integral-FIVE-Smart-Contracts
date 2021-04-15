import { expect } from 'chai'
import { utils } from 'ethers'

import { setupFixtureLoader } from '../shared/setup'
import { oracleFixture } from '../shared/fixtures'
import { overrides } from '../shared/utilities'

import { OracleParameters } from '../shared/parameters'

describe('IntegralOracle.setParameters', () => {
  const loadFixture = setupFixtureLoader()

  it('is set up with the correct parameters', async () => {
    const { oracle, other } = await loadFixture(oracleFixture)

    const bidExponents = [utils.parseUnits('1.234'), utils.parseUnits('4.567')]
    const bidQs = [utils.parseUnits('0.123'), utils.parseUnits('0.456')]
    const askExponents = [utils.parseUnits('12.34'), utils.parseUnits('45.67')]
    const askQs = [utils.parseUnits('123.4'), utils.parseUnits('456.7')]
    const params: OracleParameters = [bidExponents, bidQs, askExponents, askQs]

    const epoch = await oracle.epoch()

    await expect(oracle.connect(other).setParameters(...params, overrides)).to.be.revertedWith('IO_FORBIDDEN')
    await expect(oracle.setParameters(...params, overrides))
      .to.emit(oracle, 'ParametersSet')
      .withArgs(epoch + 1, bidExponents, bidQs, askExponents, askQs)

    expect(await oracle.getParameters()).to.deep.eq(params)
  })

  it('enforces correct parameter lengths', async () => {
    const { oracle } = await loadFixture(oracleFixture)

    await expect(oracle.setParameters([1], [1, 1], [2, 2], [2, 2])).to.be.revertedWith('IO_LENGTH_MISMATCH')
    await expect(oracle.setParameters([1], [1], [2], [2, 2])).to.be.revertedWith('IO_LENGTH_MISMATCH')
  })

  it('increments the epoch', async () => {
    const { oracle } = await loadFixture(oracleFixture)

    const epoch = await oracle.epoch()
    await oracle.setParameters([], [], [], [], overrides)
    expect(await oracle.epoch()).to.eq(epoch + 1)
  })
})
