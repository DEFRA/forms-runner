import hapi from '@hapi/hapi'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import pluginOidcClient from '~/src/server/plugins/oidc-client.js'

jest.mock('openid-client')

/**
 * Answers `override` for the named setting and leaves the rest as configured.
 * The plugin reads its settings inside `register`, so a spy on the config it
 * shares is enough — the module does not need reloading.
 */
function withSetting(path: 'oidc.privateJwk', override: string) {
  const configured = config.get.bind(config)

  jest
    .spyOn(config, 'get')
    .mockImplementation((name) =>
      name === path ? override : configured(name as 'oidc.issuer')
    )
}

describe('oidc client plugin', () => {
  it('discovers the provider once and reuses the configuration', async () => {
    const discovered = {} as client.Configuration
    jest.mocked(client.discovery).mockResolvedValue(discovered)

    const server = hapi.server()
    await server.register(pluginOidcClient)

    await expect(server.app.oidc.getConfig()).resolves.toBe(discovered)
    await expect(server.app.oidc.getConfig()).resolves.toBe(discovered)

    expect(client.discovery).toHaveBeenCalledTimes(1)
  })

  it('authenticates by signed assertion, not by secret', async () => {
    jest.mocked(client.discovery).mockResolvedValue({} as client.Configuration)

    const server = hapi.server()
    await server.register(pluginOidcClient)
    await server.app.oidc.getConfig()

    expect(client.PrivateKeyJwt).toHaveBeenCalled()
    expect(jest.mocked(client.discovery).mock.calls[0][1]).toBe('runner')
  })

  it.each([
    ['is not a JWK', 'runner-1'],
    [
      'is the public half, which cannot sign',
      '{"kty":"EC","crv":"P-256","x":"m5JL81lUX1OoRo9ghKhyWLpn_VtsQRLdjL5svpgKoWQ","y":"dGgOSKYH4j4-d3EMUZkdOQ5oV0rGjGWIDyGkEqRPxPo","use":"sig","alg":"ES256","kid":"runner-1"}'
    ]
  ])(
    'fails registration when the configured key %s, so it surfaces at boot rather than at the first sign in',
    async (_case, jwk) => {
      withSetting('oidc.privateJwk', jwk)

      const server = hapi.server()

      // The message comes from JSON.parse or WebCrypto, so only check that
      // registration rejects.
      await expect(server.register(pluginOidcClient)).rejects.toThrow()
    }
  )

  it('fails registration when the sign-in flag is on but a required OIDC setting is unset, naming it', async () => {
    // Every setting reads back empty, which is what the flag being on with
    // none of them set looks like. Registration throws before it reads
    // anything else, so this needs no finer a stub.
    jest.spyOn(config, 'get').mockReturnValue('')

    const server = hapi.server()

    await expect(server.register(pluginOidcClient)).rejects.toThrow(
      'Sign-in is enabled but missing configuration: oidc.issuer, oidc.redirectUri, oidc.privateJwk'
    )
  })
})
