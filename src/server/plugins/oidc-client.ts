import { type ServerRegisterPluginObject } from '@hapi/hapi'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'

/**
 * The provider accepts one client authentication method, `private_key_jwt`.
 * We hold the private half of an EC P-256 pair and sign a short-lived
 * assertion with it. The provider holds the public half. There is no secret.
 *
 * The `kid` goes in the assertion header and tells the provider which public
 * key to verify with. It can hold two keys during a rotation while this
 * service signs with one.
 */
async function clientKey() {
  const jwk = JSON.parse(config.get('oidc.privateJwk')) as client.JWK

  return {
    key: await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    ),
    kid: jwk.kid
  }
}

/**
 * These settings default to '' so a deployment with the flag off still boots.
 * This plugin is only registered when the flag is on, so a value that is still
 * empty here means sign in cannot work. They are keyed by config path, so the
 * error names each missing one as it is set.
 */
function checkConfigurationValid() {
  const required = {
    'oidc.issuer': config.get('oidc.issuer'),
    'oidc.redirectUri': config.get('oidc.redirectUri'),
    'oidc.privateJwk': config.get('oidc.privateJwk')
  }

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(
      `Sign-in is enabled but missing configuration: ${missing.join(', ')}`
    )
  }
}

export default {
  plugin: {
    name: 'oidc-client',
    async register(server) {
      checkConfigurationValid()

      const issuer = config.get('oidc.issuer')

      // Imported at boot, not at the first sign in, so a key that cannot
      // sign fails here with the settings above.
      const key = await clientKey()

      // The local provider runs over plain http. Keyed on the environment,
      // so every deployed environment needs https.
      const isLocal = config.get('cdpEnvironment') === 'local'

      let discovered: client.Configuration | undefined

      server.app.oidc = {
        async getConfig() {
          // Discovery is one request to the provider. The first sign in pays
          // for it and the rest reuse the result.
          if (discovered) {
            return discovered
          }

          discovered = await client.discovery(
            new URL(issuer),
            config.get('oidc.clientId'),
            undefined,
            client.PrivateKeyJwt(key),
            isLocal
              ? // eslint-disable-next-line @typescript-eslint/no-deprecated -- deliberate, local development only
                { execute: [client.allowInsecureRequests] }
              : undefined
          )

          return discovered
        }
      }
    }
  }
} satisfies ServerRegisterPluginObject<void>
