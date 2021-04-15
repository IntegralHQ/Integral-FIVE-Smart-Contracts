import { expect } from 'chai'
import chalk from 'chalk'
import { BigNumber, providers, utils } from 'ethers'
import { delayFixture, oracleFixture } from './shared/fixtures'
import { factoryWithOracleAndTokensFixture } from './shared/fixtures/factoryWithOracleAndTokensFixture'
import { getEthUsdPrice } from './shared/getEthUsdPrice'
import { INFURA_PROJECT_ID } from './shared/infura'
import { buy, buyAndWait, deposit, depositAndWait, sell, sellAndWait, withdraw, withdrawAndWait } from './shared/orders'
import { parameters } from './shared/parameters'
import { setupFixtureLoader } from './shared/setup'
import { expandTo18Decimals, getEvents, getGasSpent, overrides } from './shared/utilities'

describe('Gas costs', () => {
  const loadFixture = setupFixtureLoader()

  const limits = {
    'factory.createPair': 3900000,
    'oracle.setParameters (to zero)': 300000,
    'oracle.setParameters (from zero)': 2400000,
    'oracle.setParameters (override)': 300000,
    'delay.deposit': 410000,
    'delay.deposit (second)': 230000,
    'delay.executeDeposit': 320000,
    'delay.withdraw': 240000,
    'delay.withdraw (second)': 150000,
    'delay.executeWithdraw': 220000,
    'delay.buy': 340000,
    'delay.buy (second)': 181000,
    'delay.executeBuy': 311000,
    'delay.sell': 340000,
    'delay.sell (second)': 181000,
    'delay.executeSell': 270000,
  }

  const results: { [key: string]: number } = {}

  let price: number
  let gasPrice: BigNumber
  before(async () => {
    price = await getEthUsdPrice()
    const provider = new providers.InfuraProvider('mainnet', INFURA_PROJECT_ID)
    gasPrice = await provider.getGasPrice()
  })

  after(() => {
    console.log()
    console.log('Gas usage report')
    console.log(chalk.yellow('    gas price:'), `${utils.formatUnits(gasPrice, 'gwei')} gwei`)
    console.log(chalk.yellow('    eth price:'), `$${price.toFixed(2)}`)
    for (const [name, gasUsed] of Object.entries(results)) {
      const feeEth = parseFloat(utils.formatUnits(gasPrice.mul(gasUsed), 'ether'))
      console.log(chalk.blue(`  ${name}`))
      console.log(chalk.gray('     gas used:'), gasUsed)
      console.log(chalk.gray('      eth fee:'), `Ξ${feeEth.toFixed(5)}`)
      console.log(chalk.gray('      usd fee:'), `$${(feeEth * price).toFixed(2)}`)
    }
  })

  async function reportGas(name: keyof typeof limits, tx: providers.TransactionResponse) {
    const receipt = await tx.wait()
    const gasUsed = receipt.gasUsed.toNumber()
    results[name] = gasUsed
    expect(gasUsed).to.be.lte(limits[name])
  }

  it('factory.createPair', async () => {
    const { factory, oracle, token0, token1, other } = await loadFixture(factoryWithOracleAndTokensFixture)

    const tx = await factory.createPair(token0.address, token1.address, oracle.address, other.address, overrides)
    await reportGas('factory.createPair', tx)
  })

  it('oracle.setParameters (to zero)', async () => {
    const { oracle } = await loadFixture(oracleFixture)
    const tx = await oracle.setParameters([], [], [], [])
    await reportGas('oracle.setParameters (to zero)', tx)
  })

  it('oracle.setParameters (from zero)', async () => {
    const { oracle } = await loadFixture(oracleFixture)
    await oracle.setParameters([], [], [], [])
    const tx = await oracle.setParameters(...parameters)
    await reportGas('oracle.setParameters (from zero)', tx)
  })

  it('oracle.setParameters (override)', async () => {
    const { oracle } = await loadFixture(oracleFixture)
    const tx = await oracle.setParameters(...parameters)
    await reportGas('oracle.setParameters (override)', tx)
  })

  it('delay.deposit', async () => {
    const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
    const { tx } = await deposit(delay, token0, token1, wallet)
    await reportGas('delay.deposit', tx)
    const { tx: tx2 } = await deposit(delay, token0, token1, wallet)
    await reportGas('delay.deposit (second)', tx2)
  })

  it('delay.executeDeposit', async () => {
    const { delay, token0, token1, wallet, other } = await loadFixture(delayFixture)

    await depositAndWait(delay, token0, token1, wallet)

    const userBalanceBefore = await wallet.getBalance()
    const tx = await delay.connect(other).execute(1, overrides)
    const userBalanceAfter = await wallet.getBalance()
    const userRefund = userBalanceAfter.sub(userBalanceBefore)

    const events = await getEvents(tx, 'OrderExecuted')

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, true, '0x', getGasSpent(events[0]), userRefund)
    await reportGas('delay.executeDeposit', tx)
  })

  it('delay.withdraw', async () => {
    const { delay, pair, token0, token1, wallet, addLiquidity } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    const { tx } = await withdraw(delay, pair, token0, token1, wallet)
    await reportGas('delay.withdraw', tx)
    const { tx: tx2 } = await withdraw(delay, pair, token0, token1, wallet)
    await reportGas('delay.withdraw (second)', tx2)
  })

  it('delay.executeWithdraw', async () => {
    const { delay, pair, token0, token1, wallet, other, addLiquidity } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    await withdrawAndWait(delay, pair, token0, token1, wallet, {
      gasLimit: 500000,
    })

    const userBalanceBefore = await wallet.getBalance()
    const tx = await delay.connect(other).execute(1, overrides)
    const userBalanceAfter = await wallet.getBalance()
    const userRefund = userBalanceAfter.sub(userBalanceBefore)

    const events = await getEvents(tx, 'OrderExecuted')

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, true, '0x', getGasSpent(events[0]), userRefund)
    await reportGas('delay.executeWithdraw', tx)
  })

  it('delay.buy', async () => {
    const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
    const { tx } = await buy(delay, token0, token1, wallet, {
      amountInMax: expandTo18Decimals(4),
      amountOut: expandTo18Decimals(1),
    })
    await reportGas('delay.buy', tx)
    const { tx: tx2 } = await buy(delay, token0, token1, wallet, {
      amountInMax: expandTo18Decimals(4),
      amountOut: expandTo18Decimals(1),
    })
    await reportGas('delay.buy (second)', tx2)
  })

  it('delay.executeBuy', async () => {
    const { delay, token0, token1, wallet, other, addLiquidity } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    await buyAndWait(delay, token0, token1, wallet, {
      amountInMax: expandTo18Decimals(4),
      amountOut: expandTo18Decimals(1),
      gasLimit: 500000,
    })

    const userBalanceBefore = await wallet.getBalance()
    const tx = await delay.connect(other).execute(1, overrides)
    const userBalanceAfter = await wallet.getBalance()
    const userRefund = userBalanceAfter.sub(userBalanceBefore)

    const events = await getEvents(tx, 'OrderExecuted')

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, true, '0x', getGasSpent(events[0]), userRefund)
    await reportGas('delay.executeBuy', tx)
  })

  it('delay.sell', async () => {
    const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
    const { tx } = await sell(delay, token0, token1, wallet, {
      amountIn: expandTo18Decimals(4),
      amountOutMin: expandTo18Decimals(1),
    })
    await reportGas('delay.sell', tx)
    const { tx: tx2 } = await sell(delay, token0, token1, wallet, {
      amountIn: expandTo18Decimals(4),
      amountOutMin: expandTo18Decimals(1),
    })
    await reportGas('delay.sell (second)', tx2)
  })

  it('delay.executeSell', async () => {
    const { delay, token0, token1, wallet, other, addLiquidity } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    await sellAndWait(delay, token0, token1, wallet, {
      amountIn: expandTo18Decimals(4),
      amountOutMin: expandTo18Decimals(1),
      gasLimit: 500000,
    })

    const userBalanceBefore = await wallet.getBalance()
    const tx = await delay.connect(other).execute(1, overrides)
    const userBalanceAfter = await wallet.getBalance()
    const userRefund = userBalanceAfter.sub(userBalanceBefore)

    const events = await getEvents(tx, 'OrderExecuted')

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, true, '0x', getGasSpent(events[0]), userRefund)
    await reportGas('delay.executeSell', tx)
  })
})
