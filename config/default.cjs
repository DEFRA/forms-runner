const { resolve } = require('node:path')

const { deferConfig } = require('config/defer')
const { configDotenv } = require('dotenv')

configDotenv({
  path: [resolve(__dirname, '../.env')]
})

const minute = 60 * 1000

module.exports = {
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

  rateLimit: true,

  /**
   * Email outputs
   * Email outputs will use notify to send an email to a single inbox.
   */
  notifyTemplateId: '',
  notifyAPIKey: '',

  /**
   * Logging
   */
  logLevel: process.env.LOG_LEVEL || 'info' // Accepts "trace" | "debug" | "info" | "warn" |"error"
}
