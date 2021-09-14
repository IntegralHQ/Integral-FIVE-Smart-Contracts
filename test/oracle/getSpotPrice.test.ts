import { expect } from 'chai'
import { constants, utils } from 'ethers'

import { setupFixtureLoader } from '../shared/setup'
import { oracleFixture, getOracleFixtureFor } from '../shared/fixtures'
import { OracleTest } from '../../build/types'

describe('IntegralOracle.getSpotPrice', () => {
  const loadFixture = setupFixtureLoader()

  describe('getSpotPrice', () => {
    async function testGetSpotPrice(oracle: OracleTest, xDecimals: number) {
      const price = utils.parseUnits('379.55')
      await oracle.setPrice(price)

      function getSpotPrice(xCurrent: number, xBefore: number) {
        return oracle.getSpotPrice(
          utils.parseUnits(xCurrent.toString(), xDecimals),
          utils.parseUnits(xBefore.toString(), xDecimals)
        )
      }

      expect(await getSpotPrice(100, 100)).to.eq(utils.parseUnits('379.55'))
      expect(await getSpotPrice(101, 100)).to.eq(utils.parseUnits('379.549743666251658855'))
      expect(await getSpotPrice(99, 100)).to.eq(utils.parseUnits('379.550294193104323031'))
      expect(await getSpotPrice(50, 100)).to.eq(utils.parseUnits('379.564709655216151542'))
      expect(await getSpotPrice(150, 100)).to.eq(utils.parseUnits('379.537183312582942779'))
      expect(await getSpotPrice(1000000, 0)).to.eq(utils.parseUnits('0.368801865583632'))
    }

    it('returns correct values', async () => {
      const { oracle } = await loadFixture(oracleFixture)
      await testGetSpotPrice(oracle, 18)
    })

    it('returns correct values for 20 decimals', async () => {
      const xDecimals = 20
      const yDecimals = 18
      const { oracle } = await loadFixture(getOracleFixtureFor(xDecimals, yDecimals))

      await testGetSpotPrice(oracle, xDecimals)
    })

    it('returns correct values for 8 decimals', async () => {
      const xDecimals = 8
      const yDecimals = 18
      const { oracle } = await loadFixture(getOracleFixtureFor(xDecimals, yDecimals))

      await testGetSpotPrice(oracle, xDecimals)
    })

    it('reverts on input overflow', async () => {
      const { oracle } = await loadFixture(oracleFixture)

      await expect(oracle.getSpotPrice(constants.MaxUint256, utils.parseUnits('0'))).to.be.revertedWith(
        'IO_INPUT_OVERFLOW'
      )
      await expect(oracle.getSpotPrice(utils.parseUnits('0'), constants.MaxUint256)).to.be.revertedWith(
        'IO_INPUT_OVERFLOW'
      )
    })
  })
})
