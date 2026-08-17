import { type ServerRegisterPluginObject } from '@hapi/hapi'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'

type JWK = JsonWebKey & { kid?: string }

/**
 * The provider accepts one client authentication method, `private_key_jwt`.
 * We hold the private half of an EC P-256 pair and sign a short-lived
 * assertion with it; the provider holds the public half. There is no secret.
 *
 * The `kid` travels in the assertion header, which is how the provider picks
 * the public half to verify against. That is what lets it hold both keys
 * across a rotation while this service signs with one.
 */
async function clientKey() {
  const jwk = JSON.parse(config.get('oidc.privateJwk')) as JWK

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
 * The settings sign-in needs. Each maps its config key to the configured
 * value, so a missing one is reported by the same key an operator sets in
 * the environment.
 */
function requiredSettings() {
  return {
    'oidc.issuer': config.get('oidc.issuer'),
    'oidc.redirectUri': config.get('oidc.redirectUri'),
    'oidc.privateJwk': config.get('oidc.privateJwk')
  }
}

export default {
  plugin: {
    name: 'oidc-client',
    async register(server) {
      // These settings default to '' so a deployment with the flag off still
      // boots. Registering this plugin means the flag is on, so the check
      // belongs here: it names any gap at boot, while an operator can still
      // fix it before citizens are routed to sign in.
      const missing = Object.entries(requiredSettings())
        .filter(([, value]) => !value)
        .map(([key]) => key)

      if (missing.length > 0) {
        throw new Error(
          `Sign-in is enabled but missing configuration: ${missing.join(', ')}`
        )
      }

      const issuer = config.get('oidc.issuer')

      // Imported here rather than at first sign-in, so a key this service
      // cannot sign with is named at boot alongside the settings above.
      const key = await clientKey()

      // A local development provider is served over plain http. This is keyed
      // on the environment, so every deployed environment requires https.
      const isLocal = config.get('cdpEnvironment') === 'local'

      let discovered: client.Configuration | undefined

      server.app.oidc = {
        async getConfig() {
          // Discovery is one round trip to the provider, so the first
          // sign-in pays for it and the rest of the process reuses it.
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
