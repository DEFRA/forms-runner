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

  it('has no alternative browser origins in test, so sign in returns to the configured origin', () => {
    expect(config.get('oidc.alternativeBrowserOrigins')).toEqual([])
  })

  it('defaults the flag off and every OIDC setting empty, so a deployment that has set none of them still starts', () => {
    expect(config.default('useSignInFeature')).toBe(false)
    expect(config.default('oidc.issuer')).toBe('')
    expect(config.default('oidc.redirectUri')).toBe('')
    expect(config.default('oidc.privateJwk')).toBe('')
    expect(config.default('oidc.alternativeBrowserOrigins')).toEqual([])
  })

  it('splits OIDC_ALTERNATIVE_BROWSER_ORIGINS on commas, so several origins can be set', async () => {
    const previous = process.env.OIDC_ALTERNATIVE_BROWSER_ORIGINS
    process.env.OIDC_ALTERNATIVE_BROWSER_ORIGINS =
      'https://one.example,https://two.example'

    try {
      await jest.isolateModulesAsync(async () => {
        const { config: isolated } = await import('~/src/config/index.js')

        expect(isolated.get('oidc.alternativeBrowserOrigins')).toEqual([
          'https://one.example',
          'https://two.example'
        ])
      })
    } finally {
      if (previous === undefined) {
        delete process.env.OIDC_ALTERNATIVE_BROWSER_ORIGINS
      } else {
        process.env.OIDC_ALTERNATIVE_BROWSER_ORIGINS = previous
      }
    }
  })
})
