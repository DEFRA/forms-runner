import { ecsFormat } from '@elastic/ecs-pino-format'
import { type LoggerOptions, type TransportSingleOptions } from 'pino'

import config from '~/src/server/config.js'

const loggerOptions = {
  enabled: !config.isTest,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers'],
    remove: true
  },
  level: config.logLevel,
  ...(config.isDev
    ? { transport: { target: 'pino-pretty' } as TransportSingleOptions }
    : (ecsFormat() as LoggerFormat))
}

export { loggerOptions }

type LoggerFormat = Pick<
  LoggerOptions,
  'messageKey' | 'timestamp' | 'formatters'
>
