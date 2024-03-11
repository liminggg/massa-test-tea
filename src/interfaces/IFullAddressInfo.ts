import { IAddressInfo } from './IAddressInfo'

/**
 * Represents an address with its public and secret keys.
 *
 * @see publicKey of type `string` represents the public key of the address.
 * @see secretKey of type `string` represents the secret key of the address.
 */
export interface IFullAddressInfo extends IAddressInfo {
  publicKey: string
  secretKey: string
}
