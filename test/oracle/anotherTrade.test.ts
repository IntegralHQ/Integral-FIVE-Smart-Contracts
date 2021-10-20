import { setupFixtureLoader } from '../shared/setup'
import { oracleFixture } from '../shared/fixtures'
import { overrides } from '../shared/utilities'
import { getOracleParams } from '../../deploy/tasks/params/getOracleParams'
import { BigNumber } from 'ethers'

describe('IntegralOracle.trade', () => {
  const loadFixture = setupFixtureLoader()

  it('returns correct values for trades for standard tokens', async () => {
    const { oracle } = await loadFixture(oracleFixture)
    const params = getOracleParams('weth-dai', 'DAI')
    await oracle.setParameters(...params)

    const price = '518246536654902'
    await oracle.setPrice(price, overrides)

    const xAfter = '11327811327856745674'
    const xBefore = '20200527080520057328732708'
    const yBefore = '7150715070387038'

    const yAfter = await oracle.tradeX(xAfter, xBefore, yBefore, overrides)
    console.log('tradeX yAfter:', yAfter.toString())

    const _xAfter = await oracle.tradeY(yAfter, xBefore, yBefore, overrides)
    console.log('tradeY xAfter: ', _xAfter.toString())
    const diffrence = BigNumber.from(xAfter).sub(_xAfter)
    console.log('difference: ', diffrence.toString())
  })
})
