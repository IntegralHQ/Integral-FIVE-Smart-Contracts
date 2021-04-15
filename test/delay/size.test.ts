import { expect } from 'chai'
import chalk from 'chalk'
import IntegralDelay from '../../build/IntegralDelay.json'

describe('IntegralDelay size', () => {
  const maxSize = 24000
  const size = IntegralDelay.evm.deployedBytecode.object.length / 2

  before(() => {
    console.log(chalk.gray('      size:'), size)
  })

  it(`is less than ${maxSize} B`, () => {
    expect(size).to.be.lessThan(maxSize)
  })
})
