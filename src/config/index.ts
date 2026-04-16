import { resolve } from 'node:path'

import convict, { type SchemaObj } from 'convict'
import { type LevelWithSilent } from 'pino'

import 'dotenv/config'

const isProduction = process.env.NODE_ENV === 'production'
const isDev = process.env.NODE_ENV !== 'production'
const isTest = process.env.NODE_ENV === 'test'

export const config = convict({
  appDir: {
    format: String,
    default: resolve(import.meta.dirname, '../server')
  },
  publicDir: {
    format: String,
    default: isTest
      ? resolve(import.meta.dirname, '../../test/fixtures')
      : resolve(import.meta.dirname, '../../.public')
  },

  /**
   * Server
   */
  port: {
    format: 'port',
    default: null,
    env: 'PORT'
  } as SchemaObj<number>,
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: null,
    env: 'NODE_ENV'
  } as SchemaObj<'production' | 'development' | 'test'>,
  cdpEnvironment: {
    doc: 'The CDP environment the app is currently in, with the addition of "local"',
    format: [
      'local',
      'infra-dev',
      'management',
      'dev',
      'test',
      'perf-test',
      'ext-test',
      'prod'
    ],
    default: null,
    env: 'ENVIRONMENT'
  } as SchemaObj<
    | 'local'
    | 'infra-dev'
    | 'management'
    | 'dev'
    | 'test'
    | 'perf-test'
    | 'ext-test'
    | 'prod'
  >,
  enforceCsrf: {
    format: Boolean,
    default: null,
    env: 'ENFORCE_CSRF'
  } as SchemaObj<boolean>,

  /**
   * Helper flags
   */
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDev
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },

  /**
   * Service
   */
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'Submit a form to Defra'
  },
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    default: null,
    env: 'SERVICE_VERSION'
  } as SchemaObj<string>,
  phaseTag: {
    format: String,
    default: null, // Accepts "alpha" |"beta" | ""
    env: 'PHASE_TAG'
  } as SchemaObj<string>,

  /**
   * Session storage
   * Redis integration is optional, but recommended for production environments.
   */
  sessionTimeout: {
    format: Number,
    default: null,
    env: 'SESSION_TIMEOUT'
  } as SchemaObj<number>,
  confirmationSessionTimeout: {
    format: Number,
    default: null,
    env: 'CONFIRMATION_SESSION_TIMEOUT'
  } as SchemaObj<number>,
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
    } as SchemaObj<string>,
    useSingleInstanceCache: {
      doc: 'Redis use single cache (non-clustered)',
      format: Boolean,
      default: null,
      env: 'USE_SINGLE_INSTANCE_CACHE'
    } as SchemaObj<boolean>
  },
  tracing: {
    header: {
      doc: 'Tracing header name',
      format: String,
      default: null,
      env: 'TRACING_HEADER'
    } as SchemaObj<string>
  },

  /**
   * AWS SNS Configuration
   */
  awsRegion: {
    format: String,
    default: null,
    env: 'AWS_REGION'
  } as SchemaObj<string>,
  snsAdapterTopicArn: {
    format: String,
    default: null,
    env: 'SNS_ADAPTER_TOPIC_ARN'
  } as SchemaObj<string>,
  snsSaveTopicArn: {
    format: String,
    default: null,
    env: 'SNS_SAVE_TOPIC_ARN'
  } as SchemaObj<string>,
  snsEndpoint: {
    format: String,
    default: null,
    env: 'SNS_ENDPOINT'
  } as SchemaObj<string>,
  snsFormTopicArnMap: {
    doc: 'JSON object mapping formId to SNS topic ARN for per-form additional topic routing',
    format: String,
    default: null,
    env: 'SNS_FORM_TOPIC_ARN_MAP'
  } as SchemaObj<string>,

  /**
   * API integrations
   */
  baseUrl: {
    format: String,
    default: null,
    env: 'BASE_URL'
  } as SchemaObj<string>,

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
    default: null,
    env: 'UPLOADER_BUCKET_NAME'
  } as SchemaObj<string>,

  /**
   * Logging
   */
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: null,
      env: 'LOG_ENABLED'
    } as SchemaObj<boolean>,
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: null,
      env: 'LOG_LEVEL'
    } as SchemaObj<LevelWithSilent>,
    format: {
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: null,
      env: 'LOG_FORMAT'
    } as SchemaObj<'ecs' | 'pino-pretty'>,
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
  },

  // safelist: {
  //   format: Array,
  //   default: null,
  //   env: 'SAFELIST'
  // } as SchemaObj<string[]>,

  stagingPrefix: {
    doc: 'Prefix for staging files in S3',
    format: String,
    default: null,
    env: 'STAGING_PREFIX'
  } as SchemaObj<string>,

  serviceBannerText: {
    doc: 'Service banner text used to show a maintenance message on all pages when set',
    format: String,
    default: null,
    nullable: true,
    env: 'SERVICE_BANNER_TEXT'
  } as SchemaObj<string | null>,

  googleTagManagerContainerId: {
    doc: 'Google Tag Manager container ID to be used when a user has opted in to additional cookies',
    format: String,
    default: null,
    nullable: true,
    env: 'GOOGLE_TAG_MANAGER_CONTAINER_ID'
  } as SchemaObj<string | null>,

  googleAnalyticsContainerId: {
    doc: 'Google Analytics container ID suffix (from the GA4 measurement ID, without the G- prefix) used to display the exact cookie name on the cookies page',
    format: String,
    default: null,
    nullable: true,
    env: 'GOOGLE_ANALYTICS_CONTAINER_ID'
  } as SchemaObj<string | null>,

  saveAndExitExpiryDays: {
    format: Number,
    default: null,
    env: 'SAVE_AND_EXIT_EXPIRY_IN_DAYS'
  } as SchemaObj<number>,

  storeCompletedApplicationsFor: {
    format: String,
    default: null,
    env: 'STORE_COMPLETED_APPLICATIONS_FOR'
  } as SchemaObj<string>,

  storeFeedbackFor: {
    format: String,
    default: null,
    env: 'STORE_FEEDBACK_FOR'
  } as SchemaObj<string>,

  ordnanceSurveyApiKey: {
    doc: 'The ordnance survey api key used by the postcode lookup and maps plugin',
    format: String,
    default: null,
    env: 'ORDNANCE_SURVEY_API_KEY'
  } as SchemaObj<string>,

  ordnanceSurveyApiSecret: {
    doc: 'The ordnance survey api secret used by the maps plugin',
    format: String,
    default: null,
    env: 'ORDNANCE_SURVEY_API_SECRET'
  } as SchemaObj<string>,

  useMapsFeature: {
    doc: 'Feature flag to control maps',
    format: Boolean,
    default: null,
    env: 'USE_MAPS_FEATURE'
  } as SchemaObj<boolean>,

  feedbackViaEmail: {
    doc: 'The email address (not including the mailto prefix) for feedback when the built-in CSAT form is disabled.',
    format: String,
    default: null,
    env: 'FEEDBACK_VIA_EMAIL'
  } as SchemaObj<string>,

  privateKeyForSecrets: {
    doc: 'The private key used to decrypt secret values',
    format: String,
    default: null,
    env: 'PRIVATE_KEY_FOR_SECRETS'
  } as SchemaObj<string>
})

config.validate({ allowed: 'strict' })
