import { pino } from 'pino'

import { loggerOptions } from './logger-options.js'

function createLogger() {
  return pino(loggerOptions)
}

export { createLogger }
