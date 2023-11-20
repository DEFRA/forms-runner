import pino from 'pino'

import { loggerOptions } from '~/src/server/common/helpers/logging/logger-options'

function createLogger() {
  return pino(loggerOptions)
}

export { createLogger }
