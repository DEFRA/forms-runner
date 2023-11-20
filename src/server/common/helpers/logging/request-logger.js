import hapiPino from 'hapi-pino'

import { loggerOptions } from '~/src/server/common/helpers/logging/logger-options'

const requestLogger = {
  plugin: hapiPino,
  options: loggerOptions
}

export { requestLogger }
