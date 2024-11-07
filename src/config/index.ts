import path from 'node:path'
import { fileURLToPath } from 'node:url'

import convict, { type SchemaObj } from 'convict'
import 'dotenv/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const oneMinute = 1000 * 60
const oneHour = oneMinute * 60

export const config = convict({
  appDir: {
    format: String,
    default: path.resolve(dirname, '../server')
  },
  publicDir: {
    format: String,
    default: path.resolve(dirname, '../../.public')
  },

  /**
   * Server
   */
  port: {
    format: 'port',
    default: 3009,
    env: 'PORT'
  },
  env: {
    format: ['development', 'test', 'production'],
    default: 'development',
    env: 'NODE_ENV'
  },
  enforceCsrf: {
    format: Boolean,
    default: process.env.NODE_ENV === 'production',
    env: 'ENFORCE_CSRF'
  },

  /**
   * Helper flags
   */
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

  /**
   * Service
   */
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'Submit a form to Defra'
  },
  feedbackLink: {
    doc: 'Used in your phase banner. Can be a URL or more commonly mailto mailto:feedback@department.gov.uk',
    format: String,
    default: null,
    env: 'FEEDBACK_LINK'
  } as SchemaObj<string>,
  phaseTag: {
    format: String,
    default: 'beta', // Accepts "alpha" |"beta" | ""
    env: 'PHASE_TAG'
  },

  /**
   * Session storage
   * Redis integration is optional, but recommended for production environments.
   */
  sessionTimeout: {
    format: Number,
    default: oneHour * 24, // 1 day
    env: 'SESSION_TIMEOUT'
  },
  confirmationSessionTimeout: {
    format: Number,
    default: oneMinute * 20,
    env: 'CONFIRMATION_SESSION_TIMEOUT'
  },
  sessionCookiePassword: {
    format: String,
    default: null,
    sensitive: true,
    env: 'SESSION_COOKIE_PASSWORD'
  } as SchemaObj<string>,
  redis: {
    host: {
      doc: 'Redis cache host',
      format: String,
      default: null,
      env: 'REDIS_HOST'
    } as SchemaObj<string>,
    username: {
      doc: 'Redis cache username',
      format: String,
      default: null,
      env: 'REDIS_USERNAME'
    } as SchemaObj<string>,
    password: {
      doc: 'Redis cache password',
      format: '*',
      default: null,
      sensitive: true,
      env: 'REDIS_PASSWORD'
    } as SchemaObj<string>,
    keyPrefix: {
      doc: 'Redis cache key prefix name used to isolate the cached results across multiple clients',
      format: String,
      default: null,
      env: 'REDIS_KEY_PREFIX'
    } as SchemaObj<string>
  },

  /**
   * Email outputs
   * Email outputs will use notify to send an email to a single inbox.
   */
  notifyTemplateId: {
    format: String,
    default: null,
    env: 'NOTIFY_TEMPLATE_ID'
  } as SchemaObj<string>,
  notifyAPIKey: {
    format: String,
    default: null,
    env: 'NOTIFY_API_KEY'
  } as SchemaObj<string>,

  /**
   * API integrations
   */
  managerUrl: {
    format: String,
    default: null,
    env: 'MANAGER_URL'
  } as SchemaObj<string>,

  designerUrl: {
    format: String,
    default: null,
    env: 'DESIGNER_URL'
  } as SchemaObj<string>,

  submissionUrl: {
    format: String,
    default: null,
    env: 'SUBMISSION_URL'
  } as SchemaObj<string>,

  uploaderUrl: {
    format: String,
    default: null,
    env: 'UPLOADER_URL'
  } as SchemaObj<string>,

  uploaderBucketName: {
    format: String,
    default: 'files',
    env: 'UPLOADER_BUCKET_NAME'
  },

  /**
   * Logging
   */
  logLevel: {
    doc: 'Logging level',
    format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    default: process.env.NODE_ENV === 'development' ? 'error' : 'info',
    env: 'LOG_LEVEL'
  },

  safelist: {
    format: Array,
    default: ['61bca17e-fe74-40e0-9c15-a901ad120eca.mock.pstmn.io'],
    env: 'SAFELIST'
  },

  stagingPrefix: {
    doc: 'Prefix for staging files in S3',
    format: String,
    default: 'staging',
    env: 'STAGING_PREFIX'
  },

  serviceBannerText: {
    doc: 'Service banner text used to show a maintenance message on all pages when set',
    format: String,
    default: '',
    env: 'SERVICE_BANNER_TEXT'
  }
})

config.validate({ allowed: 'strict' })
