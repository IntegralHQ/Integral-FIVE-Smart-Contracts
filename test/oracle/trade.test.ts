import { expect } from 'chai'
import { constants, utils } from 'ethers'

import { setupFixtureLoader } from '../shared/setup'
import { oracleFixture, getOracleFixtureFor } from '../shared/fixtures'
import { overrides } from '../shared/utilities'
import { IntegralOracle } from '../../build/types'

export function toDecimals(number: string, decimals: number) {
  const integer = number.split('.')[0]
  const fractions = number.split('.')[1]
  const value = [integer, fractions && fractions.slice(0, decimals)].join('.')
  return utils.parseUnits(value, decimals)
}

describe('IntegralOracle.trade', () => {
  const loadFixture = setupFixtureLoader()

  async function testTradeX(oracle: IntegralOracle, xDecimals: number, yDecimals: number) {
    const price = utils.parseUnits('379.55')
    await oracle.setPrice(price, overrides)

    function tradeX(xAfter: number, xBefore: number, yBefore: number) {
      return oracle.tradeX(
        utils.parseUnits(xAfter.toString(), xDecimals),
        utils.parseUnits(xBefore.toString(), xDecimals),
        utils.parseUnits(yBefore.toString(), yDecimals)
      )
    }

    expect(await tradeX(100, 100, 2137)).to.eq(toDecimals('2137', yDecimals))
    expect(await tradeX(99, 100, 2000)).to.eq(toDecimals('2379.55014709655216151500', yDecimals))
    expect(await tradeX(101, 100, 2000)).to.eq(toDecimals('1620.45012816687417057300', yDecimals))
    expect(await tradeX(50, 100, 1000000)).to.eq(toDecimals('1018977.86774138040378852600', yDecimals))
    expect(await tradeX(150, 100, 1000000)).to.eq(toDecimals('981022.82041718542643052500', yDecimals))
  }

  async function testTradeY(oracle: IntegralOracle, xDecimals: number, yDecimals: number) {
    const price = utils.parseUnits('379.55')
    await oracle.setPrice(price)

    function tradeY(yAfter: number, xBefore: number, yBefore: number) {
      return oracle.tradeY(
        utils.parseUnits(yAfter.toString(), yDecimals),
        utils.parseUnits(xBefore.toString(), xDecimals),
        utils.parseUnits(yBefore.toString(), yDecimals)
      )
    }

    expect(await tradeY(100, 2137, 100)).to.eq(toDecimals('2137', xDecimals))
    expect(await tradeY(99, 2000, 100)).to.eq(toDecimals('2000.00263469898798495000', xDecimals))
    expect(await tradeY(101, 2000, 100)).to.eq(toDecimals('1999.99736530101704937700', xDecimals))
    expect(await tradeY(50, 1000000, 100)).to.eq(toDecimals('1000000.13173495514219614400', xDecimals))
    expect(await tradeY(150, 1000000, 100)).to.eq(toDecimals('999999.86826505744362416900', xDecimals))
  }

  it('returns correct values for trades for standard tokens', async () => {
    const { oracle } = await loadFixture(oracleFixture)

    await testTradeX(oracle, 18, 18)
    await testTradeY(oracle, 18, 18)
  })

  it('returns correct values for trades when tokenX has 8 decimals', async () => {
    const xDecimals = 8
    const yDecimals = 18
    const { oracle } = await loadFixture(getOracleFixtureFor(xDecimals, yDecimals))

    await testTradeX(oracle, xDecimals, yDecimals)
    await testTradeY(oracle, xDecimals, yDecimals)
  })

  it('returns correct values for trades when tokenX has 20 decimals', async () => {
    const xDecimals = 20
    const yDecimals = 18
    const { oracle } = await loadFixture(getOracleFixtureFor(xDecimals, yDecimals))

    await testTradeX(oracle, xDecimals, yDecimals)
    await testTradeY(oracle, xDecimals, yDecimals)
  })

  it('returns correct values for trades when tokenX has 8 decimals and tokenY has 20 decimals', async () => {
    const xDecimals = 8
    const yDecimals = 20
    const { oracle } = await loadFixture(getOracleFixtureFor(xDecimals, yDecimals))

    await testTradeX(oracle, xDecimals, yDecimals)
    await testTradeY(oracle, xDecimals, yDecimals)
  })

  it('reverts on input overflow', async () => {
    const { oracle } = await loadFixture(oracleFixture)

    await expect(oracle.tradeX(constants.MaxUint256, utils.parseUnits('0'), utils.parseUnits('0'))).to.be.revertedWith(
      'IO_INPUT_OVERFLOW'
    )
    await expect(oracle.tradeX(utils.parseUnits('0'), constants.MaxUint256, utils.parseUnits('0'))).to.be.revertedWith(
      'IO_INPUT_OVERFLOW'
    )
    await expect(oracle.tradeX(utils.parseUnits('0'), utils.parseUnits('0'), constants.MaxUint256)).to.be.revertedWith(
      'IO_INPUT_OVERFLOW'
    )

    await expect(oracle.tradeY(constants.MaxUint256, utils.parseUnits('0'), utils.parseUnits('0'))).to.be.revertedWith(
      'IO_INPUT_OVERFLOW'
    )
    await expect(oracle.tradeY(utils.parseUnits('0'), constants.MaxUint256, utils.parseUnits('0'))).to.be.revertedWith(
      'IO_INPUT_OVERFLOW'
    )
    await expect(oracle.tradeY(utils.parseUnits('0'), utils.parseUnits('0'), constants.MaxUint256)).to.be.revertedWith(
      'IO_INPUT_OVERFLOW'
    )
  })
})
