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

  tls.createSecureContext = function (options = {}) {
    const trustStoreCerts = getTrustStoreCerts(process.env)

    if (!trustStoreCerts.length) {
      server.logger.info('Could not find any TRUSTSTORE_ certificates')
    }

    const originalSecureContext = originalCreateSecureContext(options)

    trustStoreCerts.forEach((cert) => {
      // eslint-disable-next-line -- Node.js API not documented
      originalSecureContext.context.addCACert(cert)
    })

    return originalSecureContext
  }

  secureContext = tls.createSecureContext()

  return secureContext
}

/**
 * @import { Server } from '@hapi/hapi'
 * @import { SecureContext } from 'node:tls'
 */
