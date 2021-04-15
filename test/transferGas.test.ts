import { ContractTransaction, utils, Wallet } from 'ethers'
import { CustomERC20__factory, TokenGasTest__factory } from '../build/types'
import { setupFixtureLoader } from './shared/setup'

describe('Token transfer gas costs', () => {
  const loadFixture = setupFixtureLoader()

  async function fixture([wallet]: Wallet[]) {
    const gasTest = await new TokenGasTest__factory(wallet).deploy()
    const token = await new CustomERC20__factory(wallet).deploy(
      'Ganche Sucks',
      'GSUCC',
      10,
      utils.parseUnits('1234', 10)
    )
    return { gasTest, token }
  }

  it('cost for a write', async () => {
    const { gasTest } = await loadFixture(fixture)
    await printGasCost(await gasTest.bstx(), 'tx')
    await printGasCost(await gasTest.setNonZero(), 'non-zero')
    await printGasCost(await gasTest.setZero(), 'zero')
  })

  it('checks costs for token', async () => {
    const { gasTest, token, wallet, other } = await loadFixture(fixture)
    const value = await token.balanceOf(wallet.address)
    await token.transfer(gasTest.address, value)
    const tx = await gasTest.transferOut(token.address, other.address, value.div(2))
    await printGasCost(tx, 'token')
  })
})

async function printGasCost(tx: ContractTransaction, label: string) {
  const receipt = await tx.wait()
  const gasUsed = receipt.events?.find((x) => x.event === 'GasUsed')?.args?.value
  console.log(label, gasUsed?.toString(), receipt.gasUsed.toString())
}
