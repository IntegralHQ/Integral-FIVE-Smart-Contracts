import { BigNumber, utils, constants, Wallet, ContractTransaction, Event, providers } from 'ethers'
import { ERC20, IntegralToken } from '../../build/types'

const PERMIT_TYPEHASH = utils.keccak256(
  utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
)

export const MAX_UINT_96 = BigNumber.from(2).pow(96).sub(1)

export function expandTo18Decimals(n: number | string): BigNumber {
  return expandToDecimals(n, 18)
}

export function expandToDecimals(n: number | string, decimals: number): BigNumber {
  return utils.parseUnits(n.toString(), decimals)
}

export function makeFloatEncodable(n: BigNumber) {
  const hex = n.toHexString()
  if (hex.length <= 8) {
    return n
  } else {
    const cutPrecision = hex.substring(0, 8).concat('0'.repeat(hex.length - 8))
    return BigNumber.from(cutPrecision)
  }
}

function getDomainSeparator(name: string, tokenAddress: string) {
  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        utils.keccak256(
          utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
        ),
        utils.keccak256(utils.toUtf8Bytes(name)),
        utils.keccak256(utils.toUtf8Bytes('1')),
        1,
        tokenAddress,
      ]
    )
  )
}

export function getCreate2Address(
  factoryAddress: string,
  [tokenA, tokenB]: [string, string],
  bytecode: string
): string {
  const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
  const create2Inputs = [
    '0xff',
    factoryAddress,
    utils.keccak256(utils.solidityPack(['address', 'address'], [token0, token1])),
    utils.keccak256(bytecode),
  ]
  const sanitizedInputs = `0x${create2Inputs.map((i) => i.slice(2)).join('')}`
  return utils.getAddress(`0x${utils.keccak256(sanitizedInputs).slice(-40)}`)
}

export async function getApprovalDigest(
  token: ERC20,
  approve: {
    owner: string
    spender: string
    value: BigNumber
  },
  nonce: BigNumber,
  deadline: BigNumber
): Promise<string> {
  const name = await token.name()
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
  return utils.keccak256(
    utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        utils.keccak256(
          utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
          )
        ),
      ]
    )
  )
}

export async function getDelegateDigest(token: IntegralToken, newDelegate: string, expiry: number, nonce: number) {
  const domainTypehash = await token.DOMAIN_TYPEHASH()
  const delegationTypehash = await token.DELEGATION_TYPEHASH()
  const abiCoder = new utils.AbiCoder()
  const nameHash = utils.solidityKeccak256(['string'], [await token.name()])
  const domainSeparator = utils.keccak256(
    abiCoder.encode(
      ['bytes32', 'bytes32', 'uint256', 'address'],
      [domainTypehash, nameHash, await token.getChainId(), token.address]
    )
  )
  const structHash = utils.solidityKeccak256(
    ['bytes'],
    [abiCoder.encode(['bytes32', 'address', 'uint256', 'uint256'], [delegationTypehash, newDelegate, nonce, expiry])]
  )
  return utils.solidityKeccak256(
    ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
    ['0x19', '0x01', domainSeparator, structHash]
  )
}

export function signDigest(wallet: Wallet, digest: string) {
  const signingKey = new utils.SigningKey(wallet.privateKey)
  return signingKey.signDigest(digest)
}

export async function mineBlock(wallet: Wallet) {
  return wallet.sendTransaction({ to: constants.AddressZero, value: 1 })
}

export async function mineBlocks(wallet: Wallet, n: number) {
  for (let i = 0; i < n; i++) {
    await mineBlock(wallet)
  }
}

export function getFutureTime() {
  return Date.now() + 1000000
}

export function encodePrice(reserve0: BigNumber, reserve1: BigNumber) {
  return [
    reserve1.mul(BigNumber.from(2).pow(112)).div(reserve0),
    reserve0.mul(BigNumber.from(2).pow(112)).div(reserve1),
  ]
}

export const overrides = {
  gasLimit: 9999999,
}

export function pairAddressToPairId(pairAddress: string) {
  return parseInt(utils.keccak256(pairAddress).slice(2, 10), 16)
}

export async function getEvents(tx: ContractTransaction, eventName: string) {
  return (await tx.wait()).events?.filter((e) => e.event === eventName) ?? []
}

// function for 'OrderExecuted' event
export function getGasSpent(event: Event) {
  return event.args?.[3]
}

// function for 'OrderExecuted' event
export function getEthRefund(event: Event) {
  return event.args?.[4]
}

export async function getTxGasUsed(tx: Promise<providers.TransactionResponse>) {
  const receipt = await (await tx).wait()
  return receipt.gasUsed
}

export async function getCurrentBlockNumber(wallet: Wallet) {
  return await getTxBlockNumber(mineBlock(wallet))
}

export async function getTxBlockNumber(tx: providers.TransactionResponse | Promise<providers.TransactionResponse>) {
  return (await (await tx).wait()).blockNumber
}
