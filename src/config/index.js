import convict from 'convict'
import path from 'path'

const oneWeek = 7 * 24 * 60 * 60 * 1000

const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3000,
    env: 'PORT'
  },
  staticCacheTimeout: {
    doc: 'Static cache timeout in milliseconds',
    format: Number,
    default: oneWeek,
    env: 'STATIC_CACHE_TIMEOUT'
  },
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'CDP Node.js Frontend Template'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.normalize(path.join(__dirname, '..', '..'))
  },
  appPathPrefix: {
    doc: 'Application url path prefix this is needed only until we have host based routing',
    format: String,
    default: '/cdp-node-frontend-template',
    env: 'APP_PATH_PREFIX'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: process.env.NODE_ENV === 'production'
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: process.env.NODE_ENV !== 'production'
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: process.env.NODE_ENV === 'test'
  },
  logLevel: {
    doc: 'Logging level',
    format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    default: 'info',
    env: 'LOG_LEVEL'
  }
})

config.validate({ allowed: 'strict' })

export { config }
