import tls from 'node:tls'

import { getTrustStoreCerts } from '~/src/server/utils/secure-context/get-trust-store-certs.js'

/**
 * @type {SecureContext}
 */
export let secureContext

/**
 * Prepares the TLS secure context
 * @param {Server} server
 * @returns
 */
export function prepareSecureContext(server) {
  const originalCreateSecureContext = tls.createSecureContext

  tls.createSecureContext = (options = {}) => {
    const trustStoreCerts = getTrustStoreCerts(process.env)

    if (!trustStoreCerts.length) {
      server.logger.info('Could not find any TRUSTSTORE_ certificates')
    }

    const originalSecureContext = originalCreateSecureContext(options)

    trustStoreCerts.forEach((cert) => {
      originalSecureContext.context.addCACert(cert)
    })

    return originalSecureContext
  }

  secureContext = tls.createSecureContext()

  return secureContext
}

/**
 * @typedef {import('@hapi/hapi').Server} Server
 * @typedef {import('node:tls').SecureContext} SecureContext
 */
