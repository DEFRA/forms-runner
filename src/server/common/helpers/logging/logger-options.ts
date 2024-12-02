import { ecsFormat } from '@elastic/ecs-pino-format'
import { type LoggerOptions } from 'pino'

import { config } from '~/src/config/index.js'

const loggerOptions = {
  enabled: !config.get('isTest'),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers'],
    remove: true
  },
  level: config.get('logLevel'),
  ...(config.get('isDevelopment')
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : (ecsFormat() as Omit<LoggerOptions, 'mixin' | 'transport'>))
}

export { loggerOptions }
