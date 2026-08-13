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
})
