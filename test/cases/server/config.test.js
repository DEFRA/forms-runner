import { configSchema } from '~/src/server/utils/configSchema.js'

describe(`Server config validation`, () => {
  const requiredVars = {
    redisHost: 'dummy',
    redisUsername: 'dummy',
    redisPassword: 'dummy',
    redisKeyPrefix: 'dummy',
    sessionCookiePassword: 'test-env-session-cookie-password',
    notifyTemplateId: 'dummy',
    notifyAPIKey: 'dummy'
  }

  test('it throws when MATOMO_URL is insecure', () => {
    const configWithInsecureUrl = {
      ...requiredVars,
      matomoUrl: 'http://insecure.url'
    }

    const { error } = configSchema.validate(configWithInsecureUrl)

    expect(error.message).toContain(
      'Provided matomoUrl is insecure, please use https'
    )
  })
})
