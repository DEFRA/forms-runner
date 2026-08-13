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

export default {
  plugin: {
    name: 'oidc-client',
    register(server) {
      const issuer = config.get('oidc.issuer')

      let discovered: client.Configuration | undefined

      server.app.oidc = {
        async getConfig() {
          discovered ??= await client.discovery(
            new URL(issuer),
            config.get('oidc.clientId'),
            undefined,
            client.PrivateKeyJwt(await clientKey()),
            // A local issuer is served over plain http. The library flags this
            // to keep it out of deployed environments, which is why it is
            // reached for only when the issuer itself is insecure.
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
