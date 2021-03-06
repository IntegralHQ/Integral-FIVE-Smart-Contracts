import { expect } from 'chai'
import { tokenSharesFixture } from './shared/fixtures'
import { setupFixtureLoader } from './shared/setup'

describe('TokenShares', () => {
  const loadFixture = setupFixtureLoader()

  describe('amountToShares', () => {
    it('returns 0 given 0', async () => {
      const { tokenShares, amountToShares, adjustableErc20 } = await loadFixture(tokenSharesFixture)
      const shares = await amountToShares(adjustableErc20.address, 0)
      expect(shares).to.equal(0)
      const totalShares = await tokenShares.totalShares(adjustableErc20.address)
      expect(totalShares).to.equal(0)
    })

    it('mints shares equal to initial deposit', async () => {
      const { tokenShares, amountToShares, adjustableErc20 } = await loadFixture(tokenSharesFixture)
      const shares = await amountToShares(adjustableErc20.address, 200)
      expect(shares).to.equal(200)
      const totalShares = await tokenShares.totalShares(adjustableErc20.address)
      expect(totalShares).to.equal(200)
    })

    it('continues minting shares', async () => {
      const { tokenShares, amountToShares, adjustableErc20 } = await loadFixture(tokenSharesFixture)
      await amountToShares(adjustableErc20.address, 200)
      const shares = await amountToShares(adjustableErc20.address, 300)
      expect(shares).to.equal(300)
      const totalShares = await tokenShares.totalShares(adjustableErc20.address)
      expect(totalShares).to.equal(500)
    })

    it('accounts for balance changing', async () => {
      const { tokenShares, amountToShares, adjustableErc20 } = await loadFixture(tokenSharesFixture)
      await amountToShares(adjustableErc20.address, 200)
      await adjustableErc20.setBalance(tokenShares.address, 100)
      const shares = await amountToShares(adjustableErc20.address, 300)
      expect(shares).to.equal(600)
      const totalShares = await tokenShares.totalShares(adjustableErc20.address)
      expect(totalShares).to.equal(800)
    })

    it('fails when total != 0 and balance == 0', async () => {
      const { tokenShares, amountToShares, adjustableErc20 } = await loadFixture(tokenSharesFixture)
      await amountToShares(adjustableErc20.address, 200)
      await adjustableErc20.setBalance(tokenShares.address, 0)
      await expect(amountToShares(adjustableErc20.address, 100)).to.be.revertedWith('TS_INVALID_SHARES')
    })

    it('sets total to balance when total = 0', async () => {
      const { tokenShares, amountToShares, adjustableErc20 } = await loadFixture(tokenSharesFixture)
      await adjustableErc20.setBalance(tokenShares.address, 100)
      expect(await amountToShares(adjustableErc20.address, 100)).to.equal(100)
      expect(await tokenShares.totalShares(adjustableErc20.address)).to.equal(200)
    })

    it('can work with wrapped ether', async () => {
      const { tokenShares, wethToShares, weth } = await loadFixture(tokenSharesFixture)
      const sharesA = await wethToShares(weth.address, 200, 200)
      expect(sharesA).to.equal(200)
      const sharesB = await wethToShares(weth.address, 300, 300)
      expect(sharesB).to.equal(300)
      const totalShares = await tokenShares.totalShares(weth.address)
      expect(totalShares).to.equal(0)
    })

    it('checks that transferred value is at least the amount', async () => {
      const { wethToShares, weth } = await loadFixture(tokenSharesFixture)
      await expect(wethToShares(weth.address, 200, 100)).to.be.revertedWith('TS_INSUFFICIENT_AMOUNT')
    })

    it('transfers tokens from the sender', async () => {
      const { adjustableErc20, amountToShares, tokenShares } = await loadFixture(tokenSharesFixture)
      await amountToShares(adjustableErc20.address, 200)
      expect(await adjustableErc20.balanceOf(tokenShares.address)).to.equal(200)
    })

    it('transfers weth from the sender', async () => {
      const { weth, amountToShares, tokenShares } = await loadFixture(tokenSharesFixture)
      await amountToShares(weth.address, 200)
      expect(await weth.balanceOf(tokenShares.address)).to.equal(200)
    })

    it('transfers eth as weth from the sender', async () => {
      const { weth, wethToShares, tokenShares } = await loadFixture(tokenSharesFixture)
      await wethToShares(weth.address, 200, 200)
      expect(await weth.balanceOf(tokenShares.address)).to.equal(200)
    })
  })

  describe('sharesToAmount', () => {
    it('returns 0 given 0', async () => {
      const { adjustableErc20, tokenShares, sharesToAmount } = await loadFixture(tokenSharesFixture)
      const value = await sharesToAmount(adjustableErc20.address, 0)
      expect(value).to.equal(0)
      expect(await tokenShares.totalShares(adjustableErc20.address)).to.equal(0)
    })

    it('reverts with totalShares == 0', async () => {
      const { adjustableErc20, sharesToAmount } = await loadFixture(tokenSharesFixture)
      await expect(sharesToAmount(adjustableErc20.address, 100)).to.be.revertedWith('TS_INSUFFICIENT_BALANCE')
    })

    it('converts parts of the totalShares', async () => {
      const { adjustableErc20, tokenShares, amountToShares, sharesToAmount } = await loadFixture(tokenSharesFixture)
      await amountToShares(adjustableErc20.address, 300)
      const value = await sharesToAmount(adjustableErc20.address, 100)
      expect(value).to.equal(100)
      expect(await tokenShares.totalShares(adjustableErc20.address)).to.equal(200)
    })

    it('converts the entirety totalShares', async () => {
      const { adjustableErc20, tokenShares, amountToShares, sharesToAmount } = await loadFixture(tokenSharesFixture)
      await amountToShares(adjustableErc20.address, 300)
      const value = await sharesToAmount(adjustableErc20.address, 300)
      expect(value).to.equal(300)
      expect(await tokenShares.totalShares(adjustableErc20.address)).to.equal(0)
    })

    it('works with changing balances', async () => {
      const { adjustableErc20, tokenShares, amountToShares, sharesToAmount } = await loadFixture(tokenSharesFixture)
      await amountToShares(adjustableErc20.address, 300)
      await adjustableErc20.setBalance(tokenShares.address, 150)
      const value = await sharesToAmount(adjustableErc20.address, 100)
      expect(value).to.equal(50)
      expect(await tokenShares.totalShares(adjustableErc20.address)).to.equal(200)
    })

    it('can work with wrapped ether', async () => {
      const { sharesToAmount, weth } = await loadFixture(tokenSharesFixture)
      const shares = await sharesToAmount(weth.address, 200)
      expect(shares).to.equal(200)
    })
  })
})
