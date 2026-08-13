import { type ServerRegisterPluginObject } from '@hapi/hapi'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'

/**
 * The provider accepts one client authentication method, `private_key_jwt`.
 * We hold the private half of an EC P-256 pair and sign a short-lived
 * assertion with it; the provider holds the public half. There is no secret.
 */
async function clientKey() {
  const [jwk] = JSON.parse(config.get('oidc.privateJwks')).keys

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
 * The settings sign-in cannot work without. Each maps its config key to the
 * configured value, so a missing one can be reported by the same key an
 * operator would set in the environment.
 */
function requiredSettings() {
  return {
    'oidc.issuer': config.get('oidc.issuer'),
    'oidc.redirectUri': config.get('oidc.redirectUri'),
    'oidc.logoutRedirectUri': config.get('oidc.logoutRedirectUri'),
    'oidc.privateJwks': config.get('oidc.privateJwks')
  }
}

export default {
  plugin: {
    name: 'oidc-client',
    register(server) {
      // The flag defaults off and these settings default to '' so a
      // deployment without them still boots — but only with the flag off.
      // Registering this plugin means the flag is on, so a service that
      // reaches here without them would otherwise boot healthy and fail
      // every sign-in with an unnamed error; naming the gap here instead
      // lets an operator fix it before routing citizens to it.
      const missing = Object.entries(requiredSettings())
        .filter(([, value]) => !value)
        .map(([key]) => key)

      if (missing.length > 0) {
        throw new Error(
          `Sign-in is enabled but missing configuration: ${missing.join(', ')}`
        )
      }

      const issuer = config.get('oidc.issuer')

      let discovered: client.Configuration | undefined

      server.app.oidc = {
        async getConfig() {
          discovered ??= await client.discovery(
            new URL(issuer),
            config.get('oidc.clientId'),
            undefined,
            client.PrivateKeyJwt(await clientKey()),
            // A local development issuer is served over plain http.
            issuer.startsWith('http://')
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
