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
    .default(resolve(dirname(configPath), '../../../.public')),
  managerUrl: Joi.string()
    .uri()
    .default('https://forms-manager.dev.cdp-int.defra.cloud'),
  logLevel: Joi.string()
    .optional()
    .allow('trace', 'debug', 'info', 'warn', 'error'),
  logPrettyPrint: Joi.boolean().optional(),
  logRedactPaths: Joi.array().items(Joi.string()).default([]),
  feedbackLink: Joi.string(),
  phaseTag: Joi.string().optional().valid('', 'alpha', 'beta'),
  redisHost: Joi.string().required(),
  redisKeyPrefix: Joi.string().required(),
  redisUsername: Joi.string().required(),
  redisPassword: Joi.string().required(),
  serviceName: Joi.string().optional(),
  enforceCsrf: Joi.boolean().optional(),
  sessionTimeout: Joi.number(),
  sessionCookiePassword: Joi.string().required(),
  rateLimit: Joi.boolean().optional(),
  notifyTemplateId: Joi.string().required(),
  notifyAPIKey: Joi.string().required(),
  apiEnv: Joi.string().allow('test', 'production', '').optional(),
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
