import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import Joi, { type CustomHelpers } from 'joi'

import { isUrlSecure } from '~/src/server/utils/url.js'

const configPath = fileURLToPath(import.meta.url)

export function secureUrl(value: string, helper: CustomHelpers) {
  if (isUrlSecure(value)) {
    return value
  }

  return helper.message({
    custom: `Provided ${helper.state.path} is insecure, please use https`
  })
}

/**
 * joi schema validation is used here to ensure that there are not invalid key/values when a server is starting up.
 */
export const configSchema = Joi.object({
  port: Joi.number(),
  env: Joi.string().valid('development', 'test', 'production'),
  appDir: Joi.string()
    .optional()
    .default(resolve(dirname(configPath), '../../server')),
  publicDir: Joi.string()
    .optional()
    .default(resolve(dirname(configPath), '../../../public')),
  managerUrl: Joi.string()
    .uri()
    .default('https://forms-manager.dev.cdp-int.defra.cloud'),
  logLevel: Joi.string()
    .optional()
    .allow('trace', 'debug', 'info', 'warn', 'error'),
  logPrettyPrint: Joi.boolean().optional(),
  logRedactPaths: Joi.array().items(Joi.string()).default([]),
  ordnanceSurveyKey: Joi.string().optional(),
  browserRefreshUrl: Joi.string().optional(),
  feedbackLink: Joi.string(),
  phaseTag: Joi.string().optional().valid('', 'alpha', 'beta'),
  payApiUrl: Joi.string().custom(secureUrl),
  payReturnUrl: Joi.when('env', {
    is: Joi.string().valid('development', 'test'),
    then: Joi.string().default('http://localhost:3009'),
    otherwise: Joi.when('apiEnv', {
      is: Joi.string().valid('test'),
      then: Joi.string().default('http://localhost:3009'),
      otherwise: Joi.string().custom(secureUrl)
    })
  }),
  serviceUrl: Joi.string().optional(),
  redisHost: Joi.string().required(),
  redisKeyPrefix: Joi.string().required(),
  redisUsername: Joi.string().required(),
  redisPassword: Joi.string().required(),
  serviceName: Joi.string().optional(),
  documentUploadApiUrl: Joi.string().allow(null),
  previewMode: Joi.boolean().optional(),
  enforceCsrf: Joi.boolean().optional(),
  sslKey: Joi.string().optional(),
  sslCert: Joi.string().optional(),
  sessionTimeout: Joi.number(),
  sessionCookiePassword: Joi.string().required(),
  rateLimit: Joi.boolean().optional(),
  fromEmailAddress: Joi.string().optional().allow(''),
  serviceStartPage: Joi.string().optional().allow(''),
  privacyPolicyUrl: Joi.string().optional().allow(''),
  notifyTemplateId: Joi.string().optional().allow(''),
  notifyAPIKey: Joi.string().optional().allow(''),
  apiEnv: Joi.string().allow('test', 'production', '').optional(),
  authEnabled: Joi.boolean().optional(),
  authClientId: Joi.string().when('authEnabled', {
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  authClientSecret: Joi.string().when('authEnabled', {
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  authClientAuthUrl: Joi.string().when('authEnabled', {
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  authClientTokenUrl: Joi.string().when('authEnabled', {
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  authClientProfileUrl: Joi.string().when('authEnabled', {
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  safelist: Joi.array().items(Joi.string()),
  initialisedSessionTimeout: Joi.number(),
  initialisedSessionKey: Joi.string(),
  initialisedSessionAlgorithm: Joi.string()
    .allow(
      'RS256',
      'RS384',
      'RS512',
      'PS256',
      'PS384',
      'PS512',
      'ES256',
      'ES384',
      'ES512',
      'EdDSA',
      'RS256',
      'RS384',
      'RS512',
      'PS256',
      'PS384',
      'PS512',
      'HS256',
      'HS384',
      'HS512'
    )
    .default('HS512'),

  enableQueueService: Joi.boolean().optional(),
  queueDatabaseUrl: Joi.string().when('enableQueueService', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional().allow('')
  }),
  queueServicePollingInterval: Joi.number().when('enableQueueService', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  allowUserTemplates: Joi.boolean().optional()
})

export function buildConfig(config) {
  // Validate config
  const result = configSchema.validate(config, {
    abortEarly: false,
    convert: true,
    allowUnknown: true
  })

  // Throw if config is invalid
  if (result.error) {
    throw new Error(`The server config is invalid. ${result.error.message}`)
  }

  return result.value
}
