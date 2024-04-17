import pino from 'hapi-pino'
import { loggerOptions } from '../common/helpers/logging/logger-options.js'

export default {
  plugin: pino,
  options: loggerOptions
}
