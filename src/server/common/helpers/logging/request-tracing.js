import { tracing } from '@defra/hapi-tracing'

import { config } from '~/src/config/index.js'

// Explicitly declare the expected type

export const requestTracing = {
  plugin: tracing,
  options: { tracingHeader: config.get('tracing').header }
}
