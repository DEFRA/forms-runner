import { config } from '~/src/config/index.js'

describe('sign in configuration', () => {
  it('exposes the feature flag, off by default in test', () => {
    expect(config.get('useSignInFeature')).toBe(false)
  })

  it('exposes the OIDC client configuration', () => {
    expect(config.get('oidc.issuer')).toBe('http://localhost:3011')
    expect(config.get('oidc.clientId')).toBe('runner')
    expect(config.get('oidc.redirectUri')).toBe(
      'http://localhost:3009/callback'
    )
    expect(config.get('oidc.logoutRedirectUri')).toBe(
      'http://localhost:3009/signed-out'
    )
  })

  it('loads with the flag and every OIDC variable unset, so a deployment with the feature off still starts', async () => {
    const unset = [
      'USE_SIGN_IN_FEATURE',
      'OIDC_ISSUER',
      'OIDC_REDIRECT_URI',
      'OIDC_LOGOUT_REDIRECT_URI',
      'OIDC_CLIENT_PRIVATE_JWKS'
    ] as const

    const saved = Object.fromEntries(
      unset.map((key) => [key, process.env[key]])
    )
    unset.forEach((key) => Reflect.deleteProperty(process.env, key))

    try {
      await jest.isolateModulesAsync(async () => {
        const { config: freshConfig } = await import('~/src/config/index.js')

        expect(freshConfig.get('useSignInFeature')).toBe(false)
        expect(freshConfig.get('oidc.issuer')).toBe('')
        expect(freshConfig.get('oidc.redirectUri')).toBe('')
        expect(freshConfig.get('oidc.logoutRedirectUri')).toBe('')
        expect(freshConfig.get('oidc.privateJwks')).toBe('')
      })
    } finally {
      unset.forEach((key) => {
        const value = saved[key]
        if (value !== undefined) {
          process.env[key] = value
        }
      })
    }
  })
})
