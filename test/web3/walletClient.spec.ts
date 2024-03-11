/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-var-requires */
import { IAccount } from '../../src/interfaces/IAccount'
import { ClientFactory } from '../../src/web3/ClientFactory'
import { WalletClient } from '../../src/web3/WalletClient'
import { Client } from '../../src/web3/Client'
import { IProvider, ProviderType } from '../../src/interfaces/IProvider'
import { expect, test, describe, beforeEach, afterEach } from '@jest/globals'
import * as ed from '@noble/ed25519'
import { ISignature } from '../../src/interfaces/ISignature'
import { IFullAddressInfo } from '../../src/interfaces/IFullAddressInfo'
import {
  BUILDNET_CHAIN_ID,
  mockResultSendJsonRPCRequestWalletInfo,
} from './mockData'
import { ITransactionData } from '../../src/interfaces/ITransactionData'
import { OperationTypeId } from '../../src/interfaces/OperationTypes'
import { JSON_RPC_REQUEST_METHOD } from '../../src/interfaces/JsonRpcMethods'
import { mockAddressesInfo, mockNodeStatusInfo, mockOpIds } from './mockData'
import { IRollsData } from '../../src/interfaces/IRollsData'
import { fromMAS } from '@massalabs/web3-utils'
import { Web3Account } from '../../src/web3/accounts/Web3Account'
import { IBaseAccount } from '../../src/interfaces/IBaseAccount'

// TODO: Use env variables and say it in the CONTRIBUTING.md
const deployerPrivateKey =
  'S12XuWmm5jULpJGXBnkeBsuiNmsGi2F4rMiTvriCzENxBR4Ev7vd'
const receiverPrivateKey = 'S1eK3SEXGDAWN6pZhdr4Q7WJv6UHss55EB14hPy4XqBpiktfPu6'

// for CI testing:
const publicApi = 'https://mock-public-api.com'
const privateApi = 'https://mock-private-api.com'
const chainId = BUILDNET_CHAIN_ID

const MAX_WALLET_ACCOUNTS = 256

export async function initializeClient() {
  const deployerAccount: IAccount =
    await WalletClient.getAccountFromSecretKey(deployerPrivateKey)
  const web3Client: Client = await ClientFactory.createCustomClient(
    [
      { url: publicApi, type: ProviderType.PUBLIC } as IProvider,
      { url: privateApi, type: ProviderType.PRIVATE } as IProvider,
    ],
    chainId,
    true,
    deployerAccount // setting deployer account as base account
  )
  return web3Client
}

function createFullAddressInfo(
  address: string | null,
  publicKey: string | null,
  secretKey: string | null
): IFullAddressInfo {
  if (!address || !publicKey || !secretKey) {
    throw new Error('Invalid address, public key or secret key')
  }
  return {
    address,
    candidate_balance: '0',
    candidate_datastore_keys: [],
    candidate_roll_count: 0,
    created_blocks: [],
    created_endorsements: [],
    created_operations: [],
    cycle_infos: [],
    deferred_credits: [],
    final_balance: '0',
    final_datastore_keys: [],
    final_roll_count: 0,
    next_block_draws: [],
    next_endorsement_draws: [],
    thread: 0,
    publicKey,
    secretKey,
  }
}

describe('WalletClient', () => {
  let web3Client: Client
  // let walletClient: WalletClient;
  let baseAccount: IAccount = {
    address: 'AU1QRRX6o2igWogY8qbBtqLYsNzYNHwvnpMC48Y6CLCv4cXe9gmK',
    secretKey: 'S12XuWmm5jULpJGXBnkeBsuiNmsGi2F4rMiTvriCzENxBR4Ev7vd',
    publicKey: 'P129tbNd4oVMRsnFvQcgSq4PUAZYYDA1pvqtef2ER6W7JqgY1Bfg',
  }

  beforeEach(async () => {
    web3Client = await initializeClient()
  })

  afterEach(async () => {
    web3Client.wallet().cleanWallet()
  })

  describe('setBaseAccount', () => {
    test('should set base account', async () => {
      const account =
        await WalletClient.getAccountFromSecretKey(receiverPrivateKey)
      await web3Client
        .wallet()
        .setBaseAccount(
          new Web3Account(account, web3Client.publicApi(), chainId)
        )
      const baseAccount = web3Client.wallet().getBaseAccount()
      expect(baseAccount).not.toBeNull()
      expect(baseAccount?.address()).toEqual(account.address)
    })

    test('should throw error if account is not valid', async () => {
      web3Client.wallet().cleanWallet()
      await expect(
        web3Client.wallet().setBaseAccount({} as IBaseAccount)
      ).rejects.toThrow()
      const incorrectAccount = {
        address: 'AU12Set6aygzt1k7ZkDwrkStYovVBzeGs8VgaZogy11s7fQzaytv3',
        secretKey: 's1eK3SEXGDAWN6pZhdr4Q7WJv6UHss55EB14hPy4XqBpiktfPu6', // prefix is incorrect
        publicKey: 'P121uDTpo58d3SxQTENXKqSJTpB21ueSAy8RqQ2virGVeWs339ub',
      } as IAccount
      await expect(
        web3Client
          .wallet()
          .setBaseAccount(
            new Web3Account(incorrectAccount, web3Client.publicApi(), chainId)
          )
      ).rejects.toThrow()
    })

    test('should change base account if already set', async () => {
      const firstAccount =
        await WalletClient.getAccountFromSecretKey(receiverPrivateKey)
      await web3Client
        .wallet()
        .setBaseAccount(
          new Web3Account(firstAccount, web3Client.publicApi(), chainId)
        )

      const secondAccount =
        await WalletClient.getAccountFromSecretKey(deployerPrivateKey)
      await web3Client
        .wallet()
        .setBaseAccount(
          new Web3Account(secondAccount, web3Client.publicApi(), chainId)
        )

      const baseAccount = web3Client.wallet().getBaseAccount()
      expect(baseAccount).not.toBeNull()
      expect(baseAccount?.address()).toEqual(secondAccount.address)
    })
  })

  describe('getBaseAccount', () => {
    test('should return the base account', async () => {
      const fetchedBaseAccount = web3Client.wallet().getBaseAccount()
      expect(fetchedBaseAccount).not.toBeNull()
      expect(fetchedBaseAccount?.address()).toEqual(baseAccount.address)
    })

    test('should return null if base account is not set', async () => {
      web3Client.wallet().cleanWallet()
      const fetchedBaseAccount = web3Client.wallet().getBaseAccount()
      expect(fetchedBaseAccount).toBeNull()
    })
  })

  describe('getWalletAccountByAddress', () => {
    test('should return the account for a valid address', async () => {
      const accounts = [
        await WalletClient.walletGenerateNewAccount(),
        await WalletClient.walletGenerateNewAccount(),
        await WalletClient.walletGenerateNewAccount(),
      ]

      await web3Client.wallet().addAccountsToWallet(accounts)

      const targetAccount = accounts[1] // Assume we want to find the second account
      const fetchedAccount = web3Client
        .wallet()
        .getWalletAccountByAddress(targetAccount.address!)

      expect(fetchedAccount).not.toBeNull()
      expect(fetchedAccount?.address).toEqual(targetAccount.address)
    })

    test('should return undefined for a non-existent address', async () => {
      const nonexistentAddress =
        'AU12Set6aygzt1k7ZkDwrkStYovVBzeGs8VgaZogy11s7fQzaytv3' // This address doesn't exist in the wallet
      const fetchedAccount = web3Client
        .wallet()
        .getWalletAccountByAddress(nonexistentAddress)
      expect(fetchedAccount).toBeUndefined()
    })

    test('should return the account regardless of address case', async () => {
      const accounts = [await WalletClient.walletGenerateNewAccount()]

      await web3Client.wallet().addAccountsToWallet(accounts)

      const targetAccount = accounts[0] // Assume we want to find the first account
      const upperCaseAddress = targetAccount.address?.toUpperCase()
      const fetchedAccount = web3Client
        .wallet()
        .getWalletAccountByAddress(upperCaseAddress!)

      expect(fetchedAccount).not.toBeNull()
      expect(fetchedAccount?.address).toEqual(targetAccount.address)
    })
  })
  describe('addSecretKeysToWallet', () => {
    test('should throw an error when the number of accounts exceeds the maximum limit', async () => {
      const secretKeys = new Array(MAX_WALLET_ACCOUNTS + 1).fill(
        receiverPrivateKey
      )

      await expect(
        web3Client.wallet().addSecretKeysToWallet(secretKeys)
      ).rejects.toThrow(
        new RegExp(
          `Maximum number of allowed wallet accounts exceeded ${MAX_WALLET_ACCOUNTS}`
        )
      )
    })

    test('should not add duplicate accounts to the wallet (account already in wallet)', async () => {
      const addedAccounts = await web3Client
        .wallet()
        .addSecretKeysToWallet([deployerPrivateKey, receiverPrivateKey])
      const walletAccounts = web3Client.wallet().getWalletAccounts()

      // only receiver account should be added
      expect(addedAccounts[0].secretKey).toBe(deployerPrivateKey)
      expect([baseAccount, addedAccounts[1]]).toStrictEqual(walletAccounts)
      expect(addedAccounts.length).toBe(2)
      expect(web3Client.wallet().getWalletAccounts().length).toBe(2)
    })

    test('should correctly create and add accounts to the wallet', async () => {
      const accounts = [
        await WalletClient.walletGenerateNewAccount(),
        await WalletClient.walletGenerateNewAccount(),
      ]
      const secretKeys: string[] = [
        accounts[0].secretKey!,
        accounts[1].secretKey!,
      ]

      const addedAccounts = await web3Client
        .wallet()
        .addSecretKeysToWallet(secretKeys)

      expect(addedAccounts.length).toBe(2)

      // Check that both accounts have been added
      expect(addedAccounts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ address: accounts[0].address }),
          expect.objectContaining({
            address: accounts[1].address,
          }),
        ])
      )
    })
  })

  describe('getWalletAccounts', () => {
    test('should return all accounts in the wallet', async () => {
      const accounts = [
        await WalletClient.walletGenerateNewAccount(),
        await WalletClient.walletGenerateNewAccount(),
        await WalletClient.walletGenerateNewAccount(),
      ]

      await web3Client.wallet().addAccountsToWallet(accounts)
      const walletAccounts = web3Client.wallet().getWalletAccounts()
      expect(walletAccounts.length).toBe(3) // 3 generated
    })

    test('should return different accounts for different secret keys', async () => {
      const secretKey1 = 'S12XuWmm5jULpJGXBnkeBsuiNmsGi2F4rMiTvriCzENxBR4Ev7vd'
      const secretKey2 = 'S1eK3SEXGDAWN6pZhdr4Q7WJv6UHss55EB14hPy4XqBpiktfPu6'

      const accountFromPrivateKey1 =
        await WalletClient.getAccountFromSecretKey(secretKey1)
      const accountFromPrivateKey2 =
        await WalletClient.getAccountFromSecretKey(secretKey2)

      expect(accountFromPrivateKey1.address).not.toEqual(
        accountFromPrivateKey2.address
      )
      expect(accountFromPrivateKey1.publicKey).not.toEqual(
        accountFromPrivateKey2.publicKey
      )
    })
  })

  describe('walletInfo', () => {
    test('should return an empty array if the wallet is empty', async () => {
      web3Client.wallet().cleanWallet() // Make sure the wallet is empty
      const walletInfo = await web3Client.wallet().walletInfo()
      expect(walletInfo).toEqual([])
    })

    test('should throw an error if the number of retrieved wallets does not match the number of addresses in the wallet', async () => {
      jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(web3Client.wallet() as any, 'getWalletAddressesInfo')
        .mockImplementation(async () => {
          return [
            /* return fewer or more addresses than in the wallet */
          ]
        })

      await web3Client.wallet().addAccountsToWallet([baseAccount])

      await expect(web3Client.wallet().walletInfo()).rejects.toThrow(
        /Requested wallets not fully retrieved./
      )
    })

    test('should return IFullAddressInfo objects that include information from the corresponding IAddressInfo', async () => {
      const accounts = [
        baseAccount,
        await WalletClient.walletGenerateNewAccount(),
      ]
      await web3Client.wallet().addAccountsToWallet(accounts) // will not add the base account

      const mockAddressInfo: IFullAddressInfo[] = [
        createFullAddressInfo(
          baseAccount.address,
          baseAccount.publicKey,
          baseAccount.secretKey
        ),
        createFullAddressInfo(
          accounts[1].address,
          accounts[1].publicKey,
          accounts[1].secretKey
        ),
      ]

      jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(web3Client.wallet() as any, 'getWalletAddressesInfo')
        .mockImplementation(async () => {
          return mockAddressInfo
        })

      const walletInfo = await web3Client.wallet().walletInfo()
      // check that the returned walletInfo is an array of IFullAddressInfo with correct information
      walletInfo.forEach((info, index) => {
        expect(info.address).toBe(mockAddressInfo[index].address)
        expect(info.publicKey).toBe(accounts[index].publicKey)
        expect(info.secretKey).toBe(accounts[index].secretKey)
      })
    })
  })

  describe('getWalletAddressesInfo', () => {
    beforeEach(() => {
      jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(web3Client.wallet() as any, 'sendJsonRPCRequest')
        .mockResolvedValue(mockResultSendJsonRPCRequestWalletInfo)
    })

    test('should call getWalletAddressesInfo when walletInfo is called', async () => {
      const spy = jest.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        web3Client.wallet() as any,
        'getWalletAddressesInfo'
      )
      const mockAddresses = [
        baseAccount.address,
        await WalletClient.walletGenerateNewAccount().then(
          (account) => account.address
        ),
      ]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(web3Client.wallet() as any).wallet = mockAddresses.map((address) => ({
        address,
      }))

      await web3Client.wallet().walletInfo()

      expect(spy).toHaveBeenCalledWith(mockAddresses)
    })

    test('should call sendJsonRPCRequest if retryStrategyOn is false', async () => {
      const sendJsonRPCRequestSpy = jest.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        web3Client.wallet() as any,
        'sendJsonRPCRequest'
      )

      const mockAddresses = [
        baseAccount.address,
        await WalletClient.walletGenerateNewAccount().then(
          (account) => account.address
        ),
      ]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(web3Client.wallet() as any).wallet = mockAddresses.map((address) => ({
        address,
      }))

      // Enable retry strategy
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalRetryStrategy = (web3Client.wallet() as any).clientConfig
        .retryStrategyOn
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(web3Client.wallet() as any).clientConfig.retryStrategyOn = false

      await web3Client.wallet().walletInfo()

      expect(sendJsonRPCRequestSpy).toHaveBeenCalledWith(
        JSON_RPC_REQUEST_METHOD.GET_ADDRESSES,
        [mockAddresses]
      )

      // Restore original retry strategy setting
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(web3Client.wallet() as any).clientConfig.retryStrategyOn =
        originalRetryStrategy
    })
  })

  describe('removeAddressesFromWallet', () => {
    test('should remove specified addresses from the wallet', async () => {
      const accountsToRemove = await web3Client
        .wallet()
        .addSecretKeysToWallet([
          receiverPrivateKey,
          'S1USr9AFUaH7taTKeWt94qGTgaS9XkpnH1SPpctRDoK3sSJkYWk',
          'S16cS2QnKmyxxiU68Bw9Lnmt2Yttva42nahDG68awziextJgBze',
        ])
      let addressesToRemove = accountsToRemove.map((account) => account.address)

      expect(addressesToRemove.length).toBe(3)
      expect(addressesToRemove).not.toContain(null)
      await web3Client
        .wallet()
        .removeAddressesFromWallet(addressesToRemove as string[])

      const walletAccounts = web3Client.wallet().getWalletAccounts()
      addressesToRemove.forEach((address) => {
        expect(walletAccounts).not.toContainEqual(
          expect.objectContaining({ address })
        )
      })
    })
  })

  describe('cleanWallet', () => {
    test('remove all accounts from the wallet', async () => {
      web3Client.wallet().cleanWallet()
      const walletAccounts = await web3Client.wallet().getWalletAccounts()
      expect(walletAccounts.length).toBe(0) // only base account should be left
    })
  })

  describe('walletSignMessage', () => {
    test('should sign a message with a valid signer', async () => {
      const data = 'Test message'
      const signer = new Web3Account(
        baseAccount,
        web3Client.publicApi(),
        chainId
      )
      const modelSignedMessage =
        '1TXucC8nai7BYpAnMPYrotVcKCZ5oxkfWHb2ykKj2tXmaGMDL1XTU5AbC6Z13RH3q59F8QtbzKq4gzBphGPWpiDonownxE'

      const signedMessage = await WalletClient.walletSignMessage(data, signer)

      expect(signedMessage).toHaveProperty('base58Encoded')
      expect(typeof signedMessage.base58Encoded).toBe('string')
      expect(signedMessage.base58Encoded).toEqual(modelSignedMessage)
    })

    test('should throw an error when no private key is available', async () => {
      const data = 'Test message'
      let baseAccountWithoutSecretKey: IAccount = {
        ...baseAccount,
        secretKey: null,
      }
      const signer = new Web3Account(
        baseAccountWithoutSecretKey,
        web3Client.publicApi(),
        chainId
      )

      await expect(
        WalletClient.walletSignMessage(data, signer)
      ).rejects.toThrow('No private key to sign the message with')
    })

    test('should throw an error when no public key is available', async () => {
      const data = 'Test message'
      let baseAccountWithoutPublicKey: IAccount = {
        ...baseAccount,
        publicKey: null,
      }
      const signer = new Web3Account(
        baseAccountWithoutPublicKey,
        web3Client.publicApi(),
        chainId
      )

      await expect(
        WalletClient.walletSignMessage(data, signer)
      ).rejects.toThrow('No public key to verify the signed message with')
    })

    test('should throw an error when signature length is invalid', async () => {
      const data = 'Test message'
      const signer = new Web3Account(
        baseAccount,
        web3Client.publicApi(),
        chainId
      )

      // Create a spy on the 'sign' function to provide an incorrect mock implementation for this test
      const signSpy = jest.spyOn(ed, 'sign')
      signSpy.mockImplementation(() => Promise.resolve(Buffer.alloc(63))) // 63 instead of 64

      await expect(
        WalletClient.walletSignMessage(data, signer)
      ).rejects.toThrow(/Invalid signature length. Expected 64, got/)

      // Restore the original 'sign' function after the test
      signSpy.mockRestore()
    })

    test('should correctly process Buffer data', async () => {
      const data = Buffer.from('Test message')
      const modelSignedMessage =
        '1TXucC8nai7BYpAnMPYrotVcKCZ5oxkfWHb2ykKj2tXmaGMDL1XTU5AbC6Z13RH3q59F8QtbzKq4gzBphGPWpiDonownxE'
      const signer = new Web3Account(
        baseAccount,
        web3Client.publicApi(),
        chainId
      )

      const signedMessage = await WalletClient.walletSignMessage(data, signer)

      expect(signedMessage).toHaveProperty('base58Encoded')
      expect(typeof signedMessage.base58Encoded).toBe('string')
      expect(signedMessage.base58Encoded).toEqual(modelSignedMessage)
    })

    test('should throw an error if the signature could not be verified with the public key', async () => {
      const data = 'Test message'
      const signer = new Web3Account(
        baseAccount,
        web3Client.publicApi(),
        chainId
      )

      // Create a spy on the 'verify' function to provide an incorrect mock implementation for this test
      const verifySpy = jest.spyOn(ed, 'verify')
      verifySpy.mockImplementation(() => Promise.resolve(false)) // always return false

      await expect(
        WalletClient.walletSignMessage(data, signer)
      ).rejects.toThrow(
        'Signature could not be verified with public key. Please inspect'
      )

      // Restore the original 'verify' function after the test
      verifySpy.mockRestore()
    })
  })

  describe('signMessage', () => {
    test('should sign a message with a valid account', async () => {
      const data = 'Test message'
      const modelSignedMessage =
        '1TXucC8nai7BYpAnMPYrotVcKCZ5oxkfWHb2ykKj2tXmaGMDL1XTU5AbC6Z13RH3q59F8QtbzKq4gzBphGPWpiDonownxE'

      const accountSignerAddress: string = baseAccount.address!

      const signedMessage = await web3Client
        .wallet()
        .signMessage(data, chainId, accountSignerAddress)

      expect(signedMessage).toHaveProperty('base58Encoded')
      expect(typeof signedMessage.base58Encoded).toBe('string')
      expect(signedMessage.base58Encoded).toEqual(modelSignedMessage)
    })

    test('should throw an error when the account is not found', async () => {
      const data = 'Test message'
      const nonExistentSignerAddress = 'nonExistentSignerAddress'

      await expect(
        web3Client.wallet().signMessage(data, chainId, nonExistentSignerAddress)
      ).rejects.toThrow(
        `No signer account ${nonExistentSignerAddress} found in wallet`
      )
    })

    test('should correctly process Buffer data', async () => {
      const data = Buffer.from('Test message')
      const modelSignedMessage =
        '1TXucC8nai7BYpAnMPYrotVcKCZ5oxkfWHb2ykKj2tXmaGMDL1XTU5AbC6Z13RH3q59F8QtbzKq4gzBphGPWpiDonownxE'

      const accountSignerAddress = baseAccount.address!

      const signedMessage = await web3Client
        .wallet()
        .signMessage(data, chainId, accountSignerAddress)

      expect(signedMessage).toHaveProperty('base58Encoded')
      expect(typeof signedMessage.base58Encoded).toBe('string')
      expect(signedMessage.base58Encoded).toEqual(modelSignedMessage)
    })
  })

  describe('walletGenerateNewAccount', () => {
    test('should generate a new account', async () => {
      const newAccount = await WalletClient.walletGenerateNewAccount()
      // Check that the newAccount object has all necessary properties
      expect(newAccount).toHaveProperty('address')
      expect(newAccount).toHaveProperty('secretKey')
      expect(newAccount).toHaveProperty('publicKey')

      // Check that the properties are of correct type
      expect(typeof newAccount.address).toBe('string')
      expect(typeof newAccount.secretKey).toBe('string')
      expect(typeof newAccount.publicKey).toBe('string')

      // Check that the properties are not empty or null
      expect(newAccount.address).not.toBeNull()
      expect(newAccount.address).not.toBe('')
      expect(newAccount.secretKey).not.toBeNull()
      expect(newAccount.secretKey).not.toBe('')
      expect(newAccount.publicKey).not.toBeNull()
      expect(newAccount.publicKey).not.toBe('')

      // Check that keys and address have the correct length
      expect(newAccount.address?.length).toBeGreaterThanOrEqual(50)
      expect(newAccount.secretKey?.length).toBeGreaterThanOrEqual(50)
      expect(newAccount.publicKey?.length).toBeGreaterThanOrEqual(50)
    })

    test('should generate unique accounts each time', async () => {
      const newAccount1 = await WalletClient.walletGenerateNewAccount()
      const newAccount2 = await WalletClient.walletGenerateNewAccount()
      expect(newAccount1).not.toEqual(newAccount2)
    })
  })

  describe('getAccountFromSecretKey', () => {
    test('should generate an account from a secret key', async () => {
      const secretKey = 'S12syP5uCVEwaJwvXLqJyD1a2GqZjsup13UnhY6uzbtyu7ExXWZS'
      const addressModel =
        'AU12KgrLq2vhMgi8aAwbxytiC4wXBDGgvTtqGTM5R7wEB9En8WBHB'
      const publicKeyModel =
        'P12c2wsKxEyAhPC4ouNsgywzM41VsNSuwH9JdMbRt9bM8ZsMLPQA'
      const accountFromSecretKey =
        await WalletClient.getAccountFromSecretKey(secretKey)
      // Check that the accountFromSecretKey object has all necessary properties
      expect(accountFromSecretKey).toHaveProperty('address')
      expect(accountFromSecretKey).toHaveProperty('secretKey')
      expect(accountFromSecretKey).toHaveProperty('publicKey')
      // Check that the secretKey matches the models
      expect(accountFromSecretKey.address).toEqual(addressModel)
      expect(accountFromSecretKey.publicKey).toEqual(publicKeyModel)
      expect(accountFromSecretKey.secretKey).toEqual(secretKey)
    })

    test('should throw error if invalid secret key is provided', async () => {
      const invalidSecretKey = 'invalidSecretKey'
      await expect(
        WalletClient.getAccountFromSecretKey(invalidSecretKey)
      ).rejects.toThrow()

      const emptySecretKey = ''
      await expect(
        WalletClient.getAccountFromSecretKey(emptySecretKey)
      ).rejects.toThrow()

      const nullSecretKey = null
      await expect(
        WalletClient.getAccountFromSecretKey(nullSecretKey as never)
      ).rejects.toThrow()
    })
  })

  describe('verifySignature', () => {
    test('should return true for a valid signature', async () => {
      const message = 'Test message'

      const signerPublicKey = baseAccount.publicKey!
      const validSignature: ISignature = {
        publicKey: signerPublicKey,
        base58Encoded:
          '1TXucC8nai7BYpAnMPYrotVcKCZ5oxkfWHb2ykKj2tXmaGMDL1XTU5AbC6Z13RH3q59F8QtbzKq4gzBphGPWpiDonownxE',
      }
      const result = await web3Client
        .wallet()
        .verifySignature(message, validSignature)

      expect(result).toBe(true)
    })

    test('should return false for an invalid signature', async () => {
      const consoleSpy = jest.spyOn(console, 'error')
      consoleSpy.mockImplementation(() => null)

      const data = 'Test message'

      const signerPublicKey = baseAccount.publicKey!
      const invalidSignature: ISignature = {
        publicKey: signerPublicKey,
        base58Encoded:
          '2TXucC8nai7BYpAnMPYrotVcKCZ5oxkfWHb2ykKj2tXmaGMDL1XTU5AbC6Z13RH3q59F8QtbzKq4gzBphGPWpiDonownxE', // starts with 2 and not 1
      }
      const result = await web3Client
        .wallet()
        .verifySignature(data, invalidSignature)

      expect(result).toBe(false)

      consoleSpy.mockRestore()
    })
  })

  describe('getAccountBalance', () => {
    afterEach(() => {
      jest.clearAllMocks()
    })

    test('should return balance for a valid address', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(web3Client.wallet() as any).publicApiClient.getAddresses = jest
        .fn()
        .mockResolvedValue([mockAddressesInfo[2]])

      const ACCOUNT_ADDRESS =
        'AU12WVAJoH2giHAjSxk9R1XK3YhpCw2QxmkCbtXxcr4T3XCUG55nr'
      const expectedBalance = fromMAS(50)

      const balance = await web3Client
        .wallet()
        .getAccountBalance(ACCOUNT_ADDRESS!)

      expect(balance).not.toBeNull()
      expect(balance).toHaveProperty('candidate')
      expect(balance).toHaveProperty('final')
      expect(balance?.candidate).toEqual(expectedBalance)
      expect(balance?.final).toEqual(expectedBalance)
    })

    test('should return null for an invalid address', async () => {
      const consoleSpy = jest.spyOn(console, 'error')
      consoleSpy.mockImplementation(() => {})

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(web3Client.wallet() as any).publicApiClient.getAddresses = jest
        .fn()
        .mockRejectedValue(new Error('Invalid address'))
      const invalidAddress = 'invalid address'

      const balance = await web3Client
        .wallet()
        .getAccountBalance(invalidAddress)

      expect(balance).toBeNull()

      // Verify that console.error was called
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get account balance:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('addAccountsToWallet', () => {
    test('should throw an error when the number of accounts exceeds the maximum limit', async () => {
      const accounts = new Array(MAX_WALLET_ACCOUNTS + 1).fill(baseAccount)
      await expect(
        web3Client.wallet().addAccountsToWallet(accounts)
      ).rejects.toThrow(
        new RegExp(
          `Maximum number of allowed wallet accounts exceeded ${MAX_WALLET_ACCOUNTS}`
        )
      )
    })
    test('should throw an error when an account private key is missing', async () => {
      const accountWithoutKey = { ...baseAccount, secretKey: null }
      await expect(
        web3Client.wallet().addAccountsToWallet([accountWithoutKey])
      ).rejects.toThrow(new Error('Missing account private key'))
    })

    test('should throw an error when the submitted public key does not match the private key', async () => {
      const accountWithMismatchedPublicKey = {
        ...baseAccount,
        publicKey: 'mismatchedPublicKey',
      }
      await expect(
        web3Client
          .wallet()
          .addAccountsToWallet([accountWithMismatchedPublicKey])
      ).rejects.toThrow(
        new Error(
          'Public key does not correspond the the private key submitted'
        )
      )
    })

    test('should throw an error when the account address does not match the private key-derived address', async () => {
      const accountWithMismatchedAddress = {
        ...baseAccount,
        address: 'mismatchedAddress',
      }
      await expect(
        web3Client.wallet().addAccountsToWallet([accountWithMismatchedAddress])
      ).rejects.toThrow(
        new Error('Account address not correspond the the address submitted')
      )
    })

    test('should not add duplicate accounts to the wallet', async () => {
      await web3Client.wallet().addAccountsToWallet([baseAccount])
      await web3Client.wallet().addAccountsToWallet([baseAccount])
      const walletAccounts = web3Client.wallet().getWalletAccounts()
      expect(walletAccounts.length).toBe(1) // only one unique account should be added
    })

    test('should correctly add accounts to the wallet', async () => {
      const anotherAccount = await WalletClient.walletGenerateNewAccount()
      const anotherAccountBis = await WalletClient.walletGenerateNewAccount()
      const addedAccounts = await web3Client
        .wallet()
        .addAccountsToWallet([baseAccount, anotherAccount, anotherAccountBis])
      expect(addedAccounts.length).toBe(3)
      expect(addedAccounts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ address: baseAccount.address }),
          expect.objectContaining({
            address: anotherAccount.address,
          }),
          expect.objectContaining({
            address: anotherAccountBis.address,
          }),
        ])
      )
    })
  })

  describe('sendTransaction, buyRolls & sellRolls', () => {
    let receiverAccount: IAccount
    let mockTxData: ITransactionData
    let mockRollsData: IRollsData
    let mockAccount: Web3Account

    beforeAll(async () => {
      receiverAccount = await WalletClient.walletGenerateNewAccount()
    })

    beforeEach(() => {
      mockTxData = {
        fee: 1n,
        amount: 100n,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        recipientAddress: receiverAccount.address!,
      }
      mockRollsData = {
        fee: 1n,
        amount: 100n,
      }
      mockAccount = new Web3Account(
        baseAccount,
        web3Client.publicApi(),
        chainId
      )
    })

    const operationTests = [
      {
        operation: 'sendTransaction',
        operationTypeId: OperationTypeId.Transaction,
        data: () => mockTxData,
      },
      {
        operation: 'buyRolls',
        operationTypeId: OperationTypeId.RollBuy,
        data: () => mockRollsData,
      },
      {
        operation: 'sellRolls',
        operationTypeId: OperationTypeId.RollSell,
        data: () => mockRollsData,
      },
    ]

    describe.each(operationTests)(
      'operation: %s',
      ({ operation, operationTypeId, data }) => {
        beforeEach(async () => {
          const spyGetNodeStatus = jest.spyOn(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (web3Client.wallet() as any).publicApiClient,
            'getNodeStatus'
          )
          spyGetNodeStatus.mockReturnValue(mockNodeStatusInfo)

          jest
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .spyOn(web3Client.wallet() as any, 'sendJsonRPCRequest')
            .mockResolvedValue(mockOpIds)
          jest
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .spyOn(mockAccount as any, 'sendJsonRPCRequest')
            .mockResolvedValue(mockOpIds)
          web3Client.wallet().setBaseAccount(mockAccount)
        })

        test('should throw an error if no sender account is available for the transaction', async () => {
          jest
            .spyOn(web3Client.wallet(), 'getBaseAccount')
            .mockReturnValue(null)

          await expect(web3Client.wallet()[operation](data())).rejects.toThrow(
            'No tx sender available'
          )
        })

        test('should call compactBytesForOperation with correct arguments', async () => {
          const spy = jest.spyOn(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockAccount as any,
            'compactBytesForOperation'
          )

          await web3Client.wallet()[operation](data())

          expect(spy).toHaveBeenCalledWith(
            data(),
            operationTypeId,
            expect.any(Number) // expiryPeriod
          )
        })

        test('should call sign with correct arguments', async () => {
          const spy = jest.spyOn(mockAccount, 'sign')

          await web3Client.wallet()[operation](data())

          expect(spy).toHaveBeenCalledWith(
            expect.any(Buffer) // Buffer.concat([bytesPublicKey, bytesCompact])
          )
        })

        test('should call sendJsonRPCRequest with correct arguments', async () => {
          const spy = jest.spyOn(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockAccount as any,
            'sendJsonRPCRequest'
          )

          await web3Client.wallet()[operation](data())

          expect(spy).toHaveBeenCalledWith(
            JSON_RPC_REQUEST_METHOD.SEND_OPERATIONS,
            expect.any(Array) // [[data]]
          )
        })

        test('should return an array of operation ids', async () => {
          jest
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .spyOn(mockAccount as any, 'sendJsonRPCRequest')
            .mockResolvedValue(mockOpIds)

          const opIds = await web3Client.wallet()[operation](data())

          expect(opIds).toEqual([mockOpIds[0]])
        })
      }
    )

    describe('sendTransaction', () => {
      test('should throw an error if no recipient address is a contract address starting by AS', async () => {
        mockTxData.recipientAddress =
          'AS12KgrLq2vhMgi8aAwbxytiC4wXBDGgvTtqGTM5R7wEB9En8WBHB'

        await expect(
          web3Client.wallet().sendTransaction(mockTxData)
        ).rejects.toThrow()
      })
    })
  })
})
