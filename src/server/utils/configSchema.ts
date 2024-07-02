import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import Joi from 'joi'

const configPath = fileURLToPath(import.meta.url)

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
  notifyAPIKey: Joi.string().required()
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
