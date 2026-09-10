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
      '{"kty": "RSA", "n": "oZZGbrFXxz10KhX5kwfO7KsDQ_a4ujn2CRduhlTmIpDBPyM1X9tQAHdl8syo8ddoxhJNPBJxxFeo0O5yngWNejUjVUBKnCr1o5r5WTV0JkaI3WMnot_zVqfj4I5jeqj_IvFKV4Oj04Hhjwj1ClypRvMf54YfR597U41NPYmuoiYTdWIMbC3J4wtGBpz9gRzy6g2Jr595-bP-6TH3AdN29EPscwx_R4lMh6_SFgvqTxnq7Rv8M7xr5Tu0rdOI4n2_LJYnIWekbNoHPDlQ3trxmPwWeLecWXZ0y4n01VjErqdp6_nOmUXvZtQjglK-T_ryHyg08ATs50IpLfv8J3oRvw", "e": "AQAB", "use": "sig", "alg": "RS256", "kid": "runner-rs256-69b91f996624"}'
    ],
    [
      'is an elliptic curve key, which the provider no longer accepts',
      '{"kty":"EC","x":"sPNYWAwLqY94sLn19MLnxha9bUt2wu10rNOZHfDxmZc","y":"z3yiWmoETS8DMyqgj9lhH2tEfEp22oPni2fo0XjR18Q","crv":"P-256","d":"VaDufwAsu_yWvzvLytgq61JH0Ik_xnw4ACIQs9jNfwE","use":"sig","alg":"ES256","kid":"runner-es256-test"}'
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
