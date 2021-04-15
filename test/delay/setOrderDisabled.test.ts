import { expect } from 'chai'
import { delayFixture } from '../shared/fixtures'
import { OrderType } from '../shared/OrderType'
import { setupFixtureLoader } from '../shared/setup'
import { overrides } from '../shared/utilities'

describe('IntegralDelay.setOrderDisabled', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts when orderType is Empty', async () => {
    const { delay, pair } = await loadFixture(delayFixture)
    await expect(delay.setOrderDisabled(pair.address, OrderType.Empty, true, overrides)).to.revertedWith(
      'ID_INVALID_ORDER_TYPE'
    )
  })

  describe('deposit', () => {
    it('is false by default', async () => {
      const { delay, pair } = await loadFixture(delayFixture)
      expect(await delay.getDepositDisabled(pair.address)).to.be.false
    })

    it('can be changed', async () => {
      const { delay, other, pair } = await loadFixture(delayFixture)
      await expect(
        delay.connect(other).setOrderDisabled(pair.address, OrderType.Deposit, true, overrides)
      ).to.be.revertedWith('ID_FORBIDDEN')

      await expect(delay.setOrderDisabled(pair.address, OrderType.Deposit, true, overrides))
        .to.emit(delay, 'OrderDisabled')
        .withArgs(pair.address, OrderType.Deposit, true)
      expect(await delay.getDepositDisabled(pair.address)).to.be.true
    })
  })

  describe('withdraw', () => {
    it('is false by default', async () => {
      const { delay, pair } = await loadFixture(delayFixture)
      expect(await delay.getWithdrawDisabled(pair.address)).to.be.false
    })

    it('can be changed', async () => {
      const { delay, other, pair } = await loadFixture(delayFixture)
      await expect(
        delay.connect(other).setOrderDisabled(pair.address, OrderType.Withdraw, true, overrides)
      ).to.be.revertedWith('ID_FORBIDDEN')

      await expect(delay.setOrderDisabled(pair.address, OrderType.Withdraw, true, overrides))
        .to.emit(delay, 'OrderDisabled')
        .withArgs(pair.address, OrderType.Withdraw, true)
      expect(await delay.getWithdrawDisabled(pair.address)).to.be.true
    })
  })

  describe('sell', () => {
    it('is false by default', async () => {
      const { delay, pair } = await loadFixture(delayFixture)
      expect(await delay.getSellDisabled(pair.address)).to.be.false
    })

    it('can be changed', async () => {
      const { delay, other, pair } = await loadFixture(delayFixture)
      await expect(
        delay.connect(other).setOrderDisabled(pair.address, OrderType.Sell, true, overrides)
      ).to.be.revertedWith('ID_FORBIDDEN')

      await expect(delay.setOrderDisabled(pair.address, OrderType.Sell, true, overrides))
        .to.emit(delay, 'OrderDisabled')
        .withArgs(pair.address, OrderType.Sell, true)
      expect(await delay.getSellDisabled(pair.address)).to.be.true
    })
  })

  describe('buy', () => {
    it('is false by default', async () => {
      const { delay, pair } = await loadFixture(delayFixture)
      expect(await delay.getBuyDisabled(pair.address)).to.be.false
    })

    it('can be changed', async () => {
      const { delay, other, pair } = await loadFixture(delayFixture)
      await expect(
        delay.connect(other).setOrderDisabled(pair.address, OrderType.Buy, true, overrides)
      ).to.be.revertedWith('ID_FORBIDDEN')

      await expect(delay.setOrderDisabled(pair.address, OrderType.Buy, true, overrides))
        .to.emit(delay, 'OrderDisabled')
        .withArgs(pair.address, OrderType.Buy, true)
      expect(await delay.getBuyDisabled(pair.address)).to.be.true
    })
  })
})
