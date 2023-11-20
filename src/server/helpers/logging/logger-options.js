import ecsFormat from '@elastic/ecs-pino-format'

//import { config } from '~/src/config'

const loggerOptions = {
  enabled: true, // TODO re-enable !config.get('isTest'),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers'],
    remove: true
  },
  // TODO revert level: "config.get('logLevel')",
  level: 'info',
  // TODO revert ...(config.get('isDevelopment') ? { transport: { target: 'pino-pretty' } } : ecsFormat())
  ...ecsFormat()
}

export { loggerOptions }
