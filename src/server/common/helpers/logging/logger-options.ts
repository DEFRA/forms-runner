import ecsFormat from '@elastic/ecs-pino-format'

import config from '../../../config.js'

const loggerOptions = {
  enabled: !config.isTest,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers'],
    remove: true
  },
  level: config.logLevel,
  ...(config.isDev ? { transport: { target: 'pino-pretty' } } : ecsFormat())
}

export { loggerOptions }
