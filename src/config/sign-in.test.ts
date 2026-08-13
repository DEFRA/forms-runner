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
})
