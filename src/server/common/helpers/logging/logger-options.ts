import { getTraceId } from '@defra/hapi-tracing'
import { ecsFormat } from '@elastic/ecs-pino-format'
import { type Options } from 'hapi-pino'
import { type LoggerOptions, type TransportSingleOptions } from 'pino'

import { config } from '~/src/config/index.js'

const logConfig = config.get('log')
const serviceName = config.get('serviceName')
const serviceVersion = config.get('serviceVersion')

const formatters: {
  ecs: Omit<LoggerOptions, 'mixin' | 'transport'>
  'pino-pretty': { transport: TransportSingleOptions }
} = {
  ecs: {
    ...ecsFormat(),
    base: {
      service: {
        name: serviceName,
        type: 'nodeJs',
        version: serviceVersion
      }
    }
  },
  'pino-pretty': { transport: { target: 'pino-pretty' } }
}

export const loggerOptions = {
  enabled: logConfig.enabled,
  ignorePaths: ['/health'],
  redact: {
    paths: logConfig.redact,
    remove: true
  },
  level: logConfig.level,
  ...formatters[logConfig.format],
  mixin() {
    const mixinValues: { trace?: { id: string } } = {}
    const traceId = getTraceId()
    if (traceId) {
      mixinValues.trace = { id: traceId }
    }
    return mixinValues
  }
} satisfies Options
