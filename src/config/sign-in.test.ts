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

  it('loads with the flag and every OIDC variable unset, so a deployment with the feature off still starts', async () => {
    const unset = [
      'USE_SIGN_IN_FEATURE',
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
        const { config: freshConfig } = await import('~/src/config/index.js')

        expect(freshConfig.get('useSignInFeature')).toBe(false)
        expect(freshConfig.get('oidc.issuer')).toBe('')
        expect(freshConfig.get('oidc.redirectUri')).toBe('')
        expect(freshConfig.get('oidc.privateJwks')).toBe('')
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

  it.each([['OIDC_REDIRECT_URI', 'http://localhost:3009/wrong-path']])(
    'fails to load when %s points somewhere other than the route that handles it',
    async (envVar, badValue) => {
      const previous = process.env[envVar]
      process.env[envVar] = badValue

      try {
        await expect(
          jest.isolateModulesAsync(async () => {
            await import('~/src/config/index.js')
          })
        ).rejects.toThrow('must be a URL whose path is')
      } finally {
        if (previous !== undefined) {
          process.env[envVar] = previous
        }
      }
    }
  )
})
