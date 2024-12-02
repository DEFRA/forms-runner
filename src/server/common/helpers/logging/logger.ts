import { pino } from 'pino'

import { loggerOptions } from '~/src/server/common/helpers/logging/logger-options.js'

export function createLogger() {
  return pino(loggerOptions)
}
