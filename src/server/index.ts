import { join, parse } from 'path'

import plugin from '@defra/forms-engine-plugin'
import { checkFormStatus } from '@defra/forms-engine-plugin/engine/helpers.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import { formSubmissionService } from '@defra/forms-engine-plugin/services/index.js'
import {
  type FormContext,
  type FormRequestPayload,
  type FormResponseToolkit,
  type PluginOptions
} from '@defra/forms-engine-plugin/types'
import { getErrorMessage, type FormDefinition } from '@defra/forms-model'
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
import blipp from 'blipp'
import { ProxyAgent } from 'proxy-agent'

import { config } from '~/src/config/index.js'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger.js'
import { requestTracing } from '~/src/server/common/helpers/logging/request-tracing.js'
import { buildRedisClient } from '~/src/server/common/helpers/redis-client.js'
import { FORM_PREFIX } from '~/src/server/constants.js'
import { SummaryPageWithConfirmationEmailController } from '~/src/server/plugins/SummaryPageWithConfirmationEmailController.js'
import { configureBlankiePlugin } from '~/src/server/plugins/blankie.js'
import { configureCrumbPlugin } from '~/src/server/plugins/crumb.js'
import pluginErrorPages from '~/src/server/plugins/errorPages.js'
import { context } from '~/src/server/plugins/nunjucks/context.js'
import { paths } from '~/src/server/plugins/nunjucks/environment.js'
import { plugin as pluginViews } from '~/src/server/plugins/nunjucks/index.js'
import pluginPulse from '~/src/server/plugins/pulse.js'
import pluginRouter from '~/src/server/plugins/router.js'
import pluginSession from '~/src/server/plugins/session.js'
import { prepareSecureContext } from '~/src/server/secure-context.js'
import * as formsService from '~/src/server/services/formsService.js'
import { createOutputService } from '~/src/server/services/outputService.js'
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

export async function getForm(importPath: string) {
  const { ext } = parse(importPath)

  const attributes: ImportAttributes = {
    type: ext === '.json' ? 'json' : 'module'
  }

  const formImport = import(importPath, { with: attributes }) as Promise<{
    default: FormDefinition
  }>

  const { default: definition } = await formImport
  return definition
}

export const configureEnginePlugin = async ({
  formFileName,
  formFilePath
}: RouteConfig = {}): Promise<
  [
    { plugin: typeof plugin; options: PluginOptions },
    { routes: { prefix: string } }
  ]
> => {
  const services = {
    formsService,
    formSubmissionService,
    outputService: createOutputService()
  }

  let model: FormModel | undefined

  if (formFileName && formFilePath) {
    // used for test where we want to test a single form definition
    const definition = await getForm(join(formFilePath, formFileName))
    const { name } = parse(formFileName)

    const initialBasePath = `${FORM_PREFIX}/${name}`

    model = new FormModel(definition, { basePath: initialBasePath }, services)
  }

  const pluginObject = {
    plugin,
    options: {
      cache: 'session',
      nunjucks: {
        baseLayoutPath: 'layout.html',
        paths: [
          ...paths,
          join(config.get('appDir'), 'views', 'custom-engine-views')
        ]
      },
      model,
      services,
      viewContext: context,
      baseUrl: config.get('baseUrl'),
      saveAndExit: (
        request: FormRequestPayload,
        h: FormResponseToolkit,
        _context: FormContext
      ) => {
        const { params } = request
        const { slug } = params
        const { isPreview, state } = checkFormStatus(params)

        return h.redirect(
          !isPreview
            ? `/save-and-exit/${slug}`
            : `/save-and-exit/${slug}/${state}`
        )
      },
      controllers: {
        SummaryPageWithConfirmationEmailController
      },
      ordnanceSurveyApiKey: config.get('ordnanceSurveyApiKey')
    }
  }
  const routeOptions = {
    routes: { prefix: FORM_PREFIX }
  }

  return [pluginObject, routeOptions]
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

  server.events.on('log', (event, tags) => {
    if ('error' in tags) {
      server.logger.error(event.error, getErrorMessage(event.error))
      return
    }

    server.logger.info(event.data)
  })

  server.events.on('request', (request, event, tags) => {
    if ('error' in tags) {
      request.logger.error(event.error, getErrorMessage(event.error))
      return
    }

    request.logger.info(event.data)
  })

  await server.register(pluginViews)
  await server.register(...pluginEngine)
  await server.register(pluginRouter)
  await server.register(pluginErrorPages)

  if (config.get('cdpEnvironment') === 'local') {
    await server.register(blipp)
  }

  await server.register(requestTracing)

  server.state('cookieConsent', {
    ttl: 365 * 24 * 60 * 60 * 1000, // 1 year in ms
    clearInvalid: true,
    isHttpOnly: false,
    isSecure: config.get('isProduction'),
    path: '/',
    encoding: 'none' // handle this inside the application so we can share frontend/backend cookie modification
  })

  return server
}
