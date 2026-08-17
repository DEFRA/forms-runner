import { config } from '~/src/config/index.js'

describe('sign in configuration', () => {
  it('exposes the feature flag, off by default in test', () => {
    expect(config.get('useSignInFeature')).toBe(false)
  })

  it('exposes the OIDC client configuration', () => {
    expect(config.get('oidc.issuer')).toBe('http://localhost:3011')
    expect(config.get('oidc.clientId')).toBe('runner')
    expect(config.get('oidc.redirectUri')).toBe(
      'http://localhost:3009/auth/callback'
    )
  })

  it('defaults the flag off and every OIDC setting empty, so a deployment that has set none of them still starts', () => {
    expect(config.default('useSignInFeature')).toBe(false)
    expect(config.default('oidc.issuer')).toBe('')
    expect(config.default('oidc.redirectUri')).toBe('')
    expect(config.default('oidc.privateJwk')).toBe('')
  })
})
