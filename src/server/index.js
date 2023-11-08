import path from 'path'
import hapi from '@hapi/hapi'

import { config } from '~/src/config'
import { nunjucksConfig } from '~/src/config/nunjucks'
import { router } from './router'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger'
import { catchAll } from '~/src/server/common/helpers/errors'

async function createServer() {
  const server = hapi.server({
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      }
    },
    router: {
      stripTrailingSlash: true
    }
  })

  await server.register(requestLogger)

  await server.register(router, {
    routes: { prefix: config.get('appPathPrefix') }
  })

  await server.register(nunjucksConfig)

  server.ext('onPreResponse', catchAll)

  return server
}

export { createServer }
