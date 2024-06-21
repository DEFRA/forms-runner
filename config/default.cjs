const { resolve } = require('node:path')

const { deferConfig } = require('config/defer')
const { configDotenv } = require('dotenv')
const nanoid = require('nanoid')

configDotenv({
  path: [resolve(__dirname, '../.env')]
})

const minute = 60 * 1000

module.exports = {
  /**
   * Initialised sessions
   * Allows a user's state to be pre-populated.
   */
  initialisedSessionTimeout: minute * 60 * 24 * 28, // Defaults to 28 days. Set the TTL for the initialised session in ms.
  initialisedSessionKey: `${nanoid.random(16)}`, // This should be set if you are deploying replicas, otherwise the key will be different per replica
  initialisedSessionAlgorithm: 'HS512', // allowed algorithms: "RS256", "RS384", "RS512","PS256", "PS384", "PS512", "ES256", "ES384", "ES512", "EdDSA", "RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "HS256", "HS384", "HS512"

  /**
   * Server
   */
  port: process.env.PORT || 3009,
  env: process.env.NODE_ENV || 'development',
  enforceCsrf: true,

  /**
   * Helper flags
   */
  isProd: deferConfig(function () {
    return this.env === 'production'
  }),
  isDev: deferConfig(function () {
    return this.env !== 'production'
  }),
  isTest: deferConfig(function () {
    return this.env === 'test'
  }),

  /**
   * Service
   */
  serviceName: 'Submit a form to Defra',
  feedbackLink: '#', // Used in your phase banner. Can be a URL or more commonly mailto mailto:feedback@department.gov.uk
  phaseTag: 'beta', // Accepts "alpha" |"beta" | ""

  /**
   * Session storage
   * Redis integration is optional, but recommended for production environments.
   */
  sessionTimeout: 60 * minute * 24, // 1 day
  confirmationSessionTimeout: 20 * minute,
  // sessionCookiePassword: "",
  // redisHost: "http://localhost",
  // redisPassword: nanoid.random(16), // This should be set if you are deploying replicas

  /**
   * SSL
   */
  // sslKey: "", // Path to the SSL key
  // sslCert: "", // Path to the SSL certificate
  rateLimit: true,

  /**
   * Email outputs
   * Email outputs will use notify to send an email to a single inbox.
   */
  notifyTemplateId: '',
  notifyAPIKey: '',

  /**
   * API integrations
   */
  // API keys configured within a form may be set like so { "test": "test-key", "production": "prod" }.
  // Control which is used. Accepts "test" | "production" | "".
  apiEnv: '',
  // If both the api env and node env are set to "production", the pay return url will need to be secure.
  // This is not the case if either are set to "test", or if the node env is set to "development"
  // payReturnUrl: "http://localhost:3009"
  // documentUploadApiUrl: "",

  /**
   * Logging
   */
  logLevel: process.env.LOG_LEVEL || 'info', // Accepts "trace" | "debug" | "info" | "warn" |"error"
  logPrettyPrint: true,
  logRedactPaths: ["req.headers['x-forwarded-for']"], // You should check your privacy policy before disabling this. Check https://getpino.io/#/docs/redaction on how to configure redaction paths

  safelist: ['61bca17e-fe74-40e0-9c15-a901ad120eca.mock.pstmn.io'],
  allowUserTemplates: false
}
