import { Engine as CatboxMemory } from '@hapi/catbox-memory'
import { Engine as CatboxRedis } from '@hapi/catbox-redis'
import hapi, {
  type ServerOptions,
  type Request,
  type ResponseToolkit
} from '@hapi/hapi'
import inert from '@hapi/inert'
import Scooter from '@hapi/scooter'
import Wreck from '@hapi/wreck'
import Schmervice from '@hapipal/schmervice'
import blipp from 'blipp'
import { ProxyAgent } from 'proxy-agent'

import { buildRedisClient } from '~/src/server/common/helpers/redis-client.js'
import config from '~/src/server/config.js'
import { configureBlankiePlugin } from '~/src/server/plugins/blankie.js'
import { configureCrumbPlugin } from '~/src/server/plugins/crumb.js'
import { configureEnginePlugin } from '~/src/server/plugins/engine/index.js'
import pluginErrorPages from '~/src/server/plugins/errorPages.js'
import { configureInitialiseSessionPlugin } from '~/src/server/plugins/initialiseSession/configurePlugin.js'
import pluginLocale from '~/src/server/plugins/locale.js'
import pluginLogging from '~/src/server/plugins/logging.js'
import pluginPulse from '~/src/server/plugins/pulse.js'
import { configureRateLimitPlugin } from '~/src/server/plugins/rateLimit.js'
import pluginRouter from '~/src/server/plugins/router.js'
import pluginSession from '~/src/server/plugins/session.js'
import pluginViews from '~/src/server/plugins/views.js'
import { prepareSecureContext } from '~/src/server/secure-context.js'
import { CacheService } from '~/src/server/services/index.js'
import { type RouteConfig } from '~/src/server/types.js'
import getRequestInfo from '~/src/server/utils/getRequestInfo.js'

const proxyAgent = new ProxyAgent()

Wreck.agents = {
  https: proxyAgent,
  http: proxyAgent,
  httpsAllowUnauthorized: proxyAgent
}

const serverOptions = (): ServerOptions => {
  const serverOptions: ServerOptions = {
    debug: { request: [`${config.isDev}`] },
    port: config.port,
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
        engine: config.isTest
          ? new CatboxMemory()
          : new CatboxRedis({
              client: buildRedisClient()
            })
      }
    ]
  }

  return serverOptions
}

async function createServer(routeConfig: RouteConfig) {
  const server = hapi.server(serverOptions())
  const { formFileName, formFilePath, options } = routeConfig

  if (config.rateLimit) {
    await server.register(configureRateLimitPlugin(routeConfig))
  }
  await server.register(pluginLogging)

  if (config.isProd) {
    prepareSecureContext(server)
  }

  await server.register(pluginSession)
  await server.register(pluginPulse)
  await server.register(inert)
  await server.register(Scooter)
  await server.register(
    configureInitialiseSessionPlugin({
      safelist: config.safelist
    })
  )
  await server.register(configureBlankiePlugin(config))
  await server.register(configureCrumbPlugin(config, routeConfig))
  await server.register(Schmervice)

  server.registerService(CacheService)

  server.ext('onPreResponse', (request: Request, h: ResponseToolkit) => {
    const { response } = request

    if ('isBoom' in response && response.isBoom) {
      return h.continue
    }

    if ('header' in response && response.header) {
      response.header('X-Robots-Tag', 'noindex, nofollow')

      const WEBFONT_EXTENSIONS = /\.(?:eot|ttf|woff|svg|woff2)$/i
      if (!WEBFONT_EXTENSIONS.test(request.url.toString())) {
        response.header(
          'cache-control',
          'private, no-cache, no-store, must-revalidate, max-age=0'
        )
        response.header('pragma', 'no-cache')
        response.header('expires', '0')
      } else {
        response.header('cache-control', 'public, max-age=604800, immutable')
      }
    }
    return h.continue
  })

  server.ext('onRequest', (request: Request, h: ResponseToolkit) => {
    const { pathname } = getRequestInfo(request)

    request.app.location = pathname

    return h.continue
  })

  await server.register(pluginLocale)
  await server.register(pluginViews)
  await server.register(
    configureEnginePlugin(formFileName, formFilePath, options)
  )

  await server.register(pluginRouter)
  await server.register(pluginErrorPages)
  await server.register(blipp)

  return server
}

export default createServer
