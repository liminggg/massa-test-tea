/**
 * Represents a signed message.
 *
 * @see public_key - The public key of the node.
 * @see signature - The signature of the message.
 */
export interface ISignedMessage {
  public_key: string
  signature: string
}
