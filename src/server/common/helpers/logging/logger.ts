import { pino } from 'pino'

import { loggerOptions } from '~/src/server/common/helpers/logging/logger-options.js'

function createPinoLogger() {
  return pino(loggerOptions)
}

// Singleton logger instance - pino adds 'exit' listeners to process,
// so we reuse a single instance to avoid MaxListenersExceededWarning
export const logger = createPinoLogger()
