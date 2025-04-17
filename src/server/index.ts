import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
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
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger.js'
import { requestTracing } from '~/src/server/common/helpers/logging/request-tracing.js'
import { buildRedisClient } from '~/src/server/common/helpers/redis-client.js'
import { configureBlankiePlugin } from '~/src/server/plugins/blankie.js'
import { configureCrumbPlugin } from '~/src/server/plugins/crumb.js'
import { configureEnginePlugin } from '~/src/server/plugins/engine/index.js'
import pluginErrorPages from '~/src/server/plugins/errorPages.js'
import { plugin as pluginViews } from '~/src/server/plugins/nunjucks/index.js'
import pluginPulse from '~/src/server/plugins/pulse.js'
import pluginRouter from '~/src/server/plugins/router.js'
import pluginSession from '~/src/server/plugins/session.js'
import { stateSchema } from '~/src/server/schemas/index.js'
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

export async function createServer(routeConfig?: RouteConfig) {
  const server = hapi.server(serverOptions())

  await server.register(requestLogger)

  if (config.get('isProduction')) {
    prepareSecureContext(server)
  }

  const pluginEngine = await configureEnginePlugin(routeConfig)
  const pluginCrumb = configureCrumbPlugin(routeConfig)
  const pluginBlankie = configureBlankiePlugin()

  await server.register(pluginSession)
  await server.register(pluginPulse)
  await server.register(inert)
  await server.register(Scooter)
  await server.register(pluginBlankie)
  await server.register(pluginCrumb)
  await server.register(Schmervice)

  server.registerService(CacheService)

  await server.register(pluginEngine, {
    routes: {
      prefix: '/form'
    }
  })

  await server.register(pluginRouter)

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
  await server.register(pluginErrorPages)
  await server.register(blipp)
  await server.register(requestTracing)

  server.state('cookieConsent', {
    ttl: 365 * 24 * 60 * 60 * 1000, // 1 year in ms
    clearInvalid: true,
    isHttpOnly: false,
    isSecure: config.get('isProduction'),
    path: '/',
    encoding: 'none' // handle this inside the application so we can share frontend/backend cookie modification
  })

  server.ext('onRequest', (request: Request, h: ResponseToolkit) => {
    const { method, path } = request

    const prefixesToIgnore = [
      '/form/',
      '/assets/',
      '/help/',
      '/javascripts/',
      '/stylesheets/',
      '/upload-status/',
      '/health',
      '/error-preview/'
    ]
    if (
      method !== 'get' ||
      path === '/' ||
      prefixesToIgnore.some(
        (prefixOrPath) => path === prefixOrPath || path.startsWith(prefixOrPath)
      )
    ) {
      return h.continue
    }

    const previewRegex = /^\/preview\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)/
    const slugPathRegex = /^\/([a-zA-Z0-9-]+)\/(.+)/
    const slugOnlyRegex = /^\/([a-zA-Z0-9-]+)$/

    // /preview/{state}/{slug}
    const previewParts = previewRegex.exec(path)
    if (previewParts) {
      const [, potentialState, potentialSlug] = previewParts
      const { error: stateError } = stateSchema.validate(potentialState)
      const { error: slugError } = slugSchema.validate(potentialSlug)
      if (!stateError && !slugError) {
        const targetUrl = `/form${path}`
        server.logger.info(
          `onRequest: Redirecting legacy preview path ${path} -> ${targetUrl}`
        )
        return h.redirect(targetUrl).permanent().takeover()
      } else {
        server.logger.warn(
          `onRequest: Invalid format for preview path start: ${path}. Responding 404.`
        )
        throw Boom.notFound(`Invalid preview path format: ${path}`)
      }
    }

    // /{slug}/
    const slugPathParts = slugPathRegex.exec(path)
    if (slugPathParts) {
      const [, potentialSlug] = slugPathParts
      const { error } = slugSchema.validate(potentialSlug)
      if (!error) {
        const targetUrl = `/form${path}`
        server.logger.info(
          `onRequest: Redirecting legacy slug path ${path} -> ${targetUrl}`
        )
        return h.redirect(targetUrl).permanent().takeover()
      }
    }

    // /{slug}
    const slugOnlyMatch = slugOnlyRegex.exec(path)
    if (slugOnlyMatch) {
      const potentialSlug = slugOnlyMatch[1]
      const { error } = slugSchema.validate(potentialSlug)
      if (!error) {
        const targetUrl = `/form/${potentialSlug}`
        server.logger.info(
          `onRequest: Redirecting legacy root slug ${path} -> ${targetUrl}`
        )
        return h.redirect(targetUrl).permanent().takeover()
      } else {
        server.logger.warn(
          `onRequest: Path ${path} matched /slug pattern but failed slug validation. Responding 404.`
        )
        throw Boom.notFound(`Invalid slug format: ${path}`)
      }
    }

    return h.continue
  })

  return server
}
