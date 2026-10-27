import { getErrorMessage } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ServerRegisterPluginObject } from '@hapi/hapi'

import {
  CITIZEN_SESSION,
  citizenSessionScheme
} from '~/src/server/auth/scheme.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'

export default {
  plugin: {
    name: 'auth',
    register(server) {
      server.auth.scheme(CITIZEN_SESSION, citizenSessionScheme)
      server.auth.strategy(CITIZEN_SESSION, CITIZEN_SESSION)

      // Applies to every route, including the ones the engine plugin
      // registers, because hapi rebuilds routes already in the table. `try`
      // means an anonymous request carries on with no credentials, so no
      // existing route changes behaviour.
      server.auth.default({ strategy: CITIZEN_SESSION, mode: 'try' })

      // `try` also carries on past a strategy that failed, and hapi reports it
      // only as this internal event. A 5xx is a fault in the service rather
      // than bad credentials. The message alone is logged, as the error can
      // carry tokens.
      server.events.on(
        {
          name: 'request',
          channels: 'internal',
          filter: { tags: ['auth', 'unauthenticated', 'try'], all: true }
        },
        (request, { error }) => {
          if (Boom.isBoom(error) && error.output.statusCode >= 500) {
            logger.error(
              `[authFailed] ${request.auth.strategy} could not authenticate the request - ${getErrorMessage(error)}`
            )
          }
        }
      )
    }
  }
} satisfies ServerRegisterPluginObject<void>
