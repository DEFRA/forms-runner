import { type ServerRegisterPluginObject } from '@hapi/hapi'
import hapiPino, { type Options } from 'hapi-pino'

import { loggerOptions } from '~/src/server/common/helpers/logging/logger-options.js'

export default {
  plugin: hapiPino,
  options: loggerOptions
} satisfies ServerRegisterPluginObject<Options>
