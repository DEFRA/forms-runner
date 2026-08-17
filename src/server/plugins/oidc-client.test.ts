import hapi from '@hapi/hapi'
import * as client from 'openid-client'

import pluginOidcClient from '~/src/server/plugins/oidc-client.js'

jest.mock('openid-client')

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

  it('fails registration when the sign-in flag is on but a required OIDC setting is unset, naming it', async () => {
    const unset = [
      'OIDC_ISSUER',
      'OIDC_REDIRECT_URI',
      'OIDC_CLIENT_PRIVATE_JWKS'
    ] as const

    const saved = Object.fromEntries(
      unset.map((key) => [key, process.env[key]])
    )
    unset.forEach((key) => Reflect.deleteProperty(process.env, key))

    // The config module imports `dotenv/config`, which would put these back
    // from a developer's own `.env` the moment it reloads. Pointing dotenv at
    // a path that does not exist keeps them unset, so this asserts the same
    // thing on a developer machine as it does on a clean checkout.
    const savedDotenvPath = process.env.DOTENV_CONFIG_PATH
    process.env.DOTENV_CONFIG_PATH = '/nonexistent/.env'

    try {
      await jest.isolateModulesAsync(async () => {
        const { default: freshPlugin } =
          await import('~/src/server/plugins/oidc-client.js')

        const server = hapi.server()

        await expect(server.register(freshPlugin)).rejects.toThrow(
          'Sign-in is enabled but missing configuration: oidc.issuer, oidc.redirectUri, oidc.privateJwks'
        )
      })
    } finally {
      if (savedDotenvPath === undefined) {
        Reflect.deleteProperty(process.env, 'DOTENV_CONFIG_PATH')
      } else {
        process.env.DOTENV_CONFIG_PATH = savedDotenvPath
      }

      unset.forEach((key) => {
        const value = saved[key]
        if (value !== undefined) {
          process.env[key] = value
        }
      })
    }
  })
})
