import { configSchema } from '../../../src/server/utils/configSchema.js'

describe(`Server config validation`, () => {
  test('it throws when MATOMO_URL is insecure', () => {
    const configWithInsecureUrl = {
      matomoUrl: 'http://insecure.url'
    }

    const { error } = configSchema.validate(configWithInsecureUrl)

    expect(error.message).toContain(
      'Provided matomoUrl is insecure, please use https'
    )
  })

  test('it throws when PAY_API_URL is insecure', () => {
    const configWithInsecureUrl = {
      payApiUrl: 'http://insecure.url'
    }

    const { error } = configSchema.validate(configWithInsecureUrl)

    expect(error.message).toContain(
      'Provided payApiUrl is insecure, please use https'
    )
  })

  test('it throws when PAY_RETURN_URL is insecure and the environment is production', () => {
    const configWithInsecureUrl = {
      payReturnUrl: 'http://insecure.url',
      env: 'production',
      apiEnv: 'production'
    }

    const { error } = configSchema.validate(configWithInsecureUrl)

    expect(error.message).toContain(
      'Provided payReturnUrl is insecure, please use https'
    )
  })

  test('it succeeds when PAY_RETURN_URL is insecure and the node environment is test', () => {
    const configWithInsecureUrl = {
      payReturnUrl: 'http://insecure.url',
      env: 'test',
      apiEnv: 'production'
    }

    const result = configSchema.validate(configWithInsecureUrl)

    expect(Object.keys(result)).not.toContain('error')
  })

  test('it succeeds when PAY_RETURN_URL is insecure and the api environment is test', () => {
    const configWithInsecureUrl = {
      payReturnUrl: 'http://insecure.url',
      env: 'production',
      apiEnv: 'test'
    }

    const result = configSchema.validate(configWithInsecureUrl)

    expect(Object.keys(result)).not.toContain('error')
  })

  test('it throws when oAuth config is incomplete', () => {
    const configWithIncompleteAuth = {
      authEnabled: true
    }
    const { error } = configSchema.validate(configWithIncompleteAuth, {
      abortEarly: false
    })

    expect(error.message).toContain(
      '"authClientId" is required. "authClientSecret" is required. "authClientAuthUrl" is required. "authClientTokenUrl" is required. "authClientProfileUrl" is required'
    )
  })
})
