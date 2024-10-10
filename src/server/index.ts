import { Engine as CatboxMemory } from '@hapi/catbox-memory'
import { Engine as CatboxRedis } from '@hapi/catbox-redis'
import hapi, {
  type Request,
  type ResponseToolkit,
  type ServerOptions
} from '@hapi/hapi'
import inert from '@hapi/inert'
import Scooter from '@hapi/scooter'
import Wreck from '@hapi/wreck'
import Schmervice from '@hapipal/schmervice'
import blipp from 'blipp'
import { ProxyAgent } from 'proxy-agent'

import { config } from '~/src/config/index.js'
import { buildRedisClient } from '~/src/server/common/helpers/redis-client.js'
import { configureBlankiePlugin } from '~/src/server/plugins/blankie.js'
import { configureCrumbPlugin } from '~/src/server/plugins/crumb.js'
import { configureEnginePlugin } from '~/src/server/plugins/engine/index.js'
import pluginErrorPages from '~/src/server/plugins/errorPages.js'
import pluginLogging from '~/src/server/plugins/logging.js'
import pluginPulse from '~/src/server/plugins/pulse.js'
import pluginRouter from '~/src/server/plugins/router.js'
import pluginSession from '~/src/server/plugins/session.js'
import pluginViews from '~/src/server/plugins/views.js'
import { prepareSecureContext } from '~/src/server/secure-context.js'
import { CacheService } from '~/src/server/services/index.js'
import { type RouteConfig } from '~/src/server/types.js'

const proxyAgent = new ProxyAgent()

Wreck.agents = {
  https: proxyAgent,
  http: proxyAgent,
  httpsAllowUnauthorized: proxyAgent
}

const serverOptions = (): ServerOptions => {
  const serverOptions: ServerOptions = {
    debug: { request: [`${config.get('isDevelopment')}`] },
    port: config.get('port'),
    router: {
      stripTrailingSlash: true
    },
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    cache: [
      {
        name: 'session',
        engine: config.get('isTest')
          ? new CatboxMemory()
          : new CatboxRedis({
              client: buildRedisClient()
            })
      }
    ]
  }

  return serverOptions
}

export async function createServer(routeConfig: RouteConfig = {}) {
  const server = hapi.server(serverOptions())
  const { formFileName, formFilePath } = routeConfig

  await server.register(pluginLogging)

  if (config.get('isProduction')) {
    prepareSecureContext(server)
  }

  await server.register(pluginSession)
  await server.register(pluginPulse)
  await server.register(inert)
  await server.register(Scooter)
  await server.register(configureBlankiePlugin())
  await server.register(configureCrumbPlugin(routeConfig))
  await server.register(Schmervice)

  server.registerService(CacheService)

  server.ext('onPreResponse', (request: Request, h: ResponseToolkit) => {
    const { response } = request

    if ('isBoom' in response) {
      return h.continue
    }

    // Prevent search engine indexing
    response.header('x-robots-tag', 'noindex, nofollow')

    // Disable cache to ensure back/foward navigation updates progress
    if (
      !request.path.startsWith('/javascripts/') &&
      !request.path.startsWith('/stylesheets/') &&
      !request.path.startsWith('/assets/')
    ) {
      response.header('cache-control', 'no-store')
    }

    return h.continue
  })

  await server.register(pluginViews)
  await server.register(configureEnginePlugin(formFileName, formFilePath))
  await server.register(pluginRouter)
  await server.register(pluginErrorPages)
  await server.register(blipp)

  return server
}
