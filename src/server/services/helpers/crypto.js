import crypto from 'node:crypto'

import { config } from '~/src/config/index.js'

/**
 * @param {string} secretValue - cleartext secret value
 * @returns {string} base64-encoded result
 */
export function decryptSecret(secretValue) {
  const privateKeyEncoded = config.get('privateKeyForSecrets')
  if (!privateKeyEncoded) {
    throw new Error('Private key is missing')
  }
  const privateKey = Buffer.from(privateKeyEncoded, 'base64').toString()
  const buffer = Buffer.from(secretValue, 'base64')
  const decrypted = crypto.privateDecrypt(privateKey, buffer)
  return decrypted.toString()
}
