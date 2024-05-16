import { dirname, join } from 'node:path'
import { cwd } from 'node:process'

import {
  // FormConfiguration,
  slugSchema
  // type FormDefinition
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
  type PluginSpecificConfiguration,
  type Request,
  type ResponseToolkit,
  type Server
} from '@hapi/hapi'
import { isEqual } from 'date-fns'
import Joi from 'joi'
import nunjucks from 'nunjucks'
import resolvePkg from 'resolve'

import config from '~/src/server/config.js'
import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import { shouldLogin } from '~/src/server/plugins/auth.js'
import {
  getValidStateFromQueryParameters,
  redirectTo
} from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/plugins/engine/services/formsService.js'
// import { type FormPayload } from '~/src/server/plugins/engine/types.js'

const [govukFrontendPath, hmpoComponentsPath] = [
  'govuk-frontend',
  'hmpo-components'
].map((pkgName) =>
  dirname(
    resolvePkg.sync(`${pkgName}/package.json`, {
      basedir: cwd()
    })
  )
)

nunjucks.configure([
  // Configure Nunjucks to allow rendering of content that is revealed conditionally.
  join(config.appDir, 'plugins/engine/views'),
  govukFrontendPath,
  join(hmpoComponentsPath, 'components')
])

function normalisePath(path: string) {
  return path.replace(/^\//, '').replace(/\/$/, '')
}

function getStartPageRedirect(
  request: Request,
  h: ResponseToolkit,
  slug: string,
  model: FormModel
) {
  const startPage = normalisePath(model.def.startPage ?? '')
  let startPageRedirect: any

  if (startPage.startsWith('http')) {
    startPageRedirect = redirectTo(request, h, startPage)
  } else {
    startPageRedirect = redirectTo(
      request,
      h,
      `/${model.basePath}/${startPage}`
    )
  }

  return startPageRedirect
}

interface PluginOptions {
  relativeTo?: string
  modelOptions: {
    relativeTo: string
    previewMode: any
  }
  model?: FormModel
  previewMode: boolean
}

const stateSchema = Joi.string().valid('draft', 'live').required()
const pathSchema = Joi.string().required()

export const plugin = {
  name: '@defra/forms-runner/engine',
  dependencies: '@hapi/vision',
  multiple: true,
  register: (server: Server, options: PluginOptions) => {
    const { model, modelOptions } = options
    // const enabledString = config.previewMode ? `[ENABLED]` : `[DISABLED]`
    // const disabledRouteDetailString =
    //   'A request was made however previewing is disabled. See environment variable details in runner/README.md if this error is not expected.'

    server.app.model = model

    /**
     * @typedef {object} CacheItem
     * @property {FormModel} model - the form model
     * @property {Date} updatedAt - The time the cache item was updated
     */

    /**
     * In-memory cache of FormModel items
     * @type {Map<string, CacheItem>}
     */
    const itemCache = new Map()

    /**
     * The following publish endpoints (/publish, /published/{id}, /published)
     * are used from the designer for operating in 'preview' mode.
     * I.E. Designs saved in the designer can be accessed in the runner for viewing.
     * The designer also uses these endpoints as a persistence mechanism for storing and retrieving data
     * for its own purposes so if you're changing these endpoints you likely need to go and amend
     * the designer too!
     */
    // server.route({
    //   method: 'post',
    //   path: '/publish',
    //   handler: (request: Request, h: ResponseToolkit) => {
    //     if (!previewMode) {
    //       request.logger.error(
    //         [`POST /publish`, 'previewModeError'],
    //         disabledRouteDetailString
    //       )
    //       throw Boom.forbidden('Publishing is disabled')
    //     }
    //     const payload = request.payload as FormPayload
    //     const { id, configuration } = payload

    //     const parsedConfiguration: FormDefinition =
    //       typeof configuration === 'string'
    //         ? JSON.parse(configuration)
    //         : configuration
    //     forms[id] = new FormModel(parsedConfiguration, {
    //       ...modelOptions,
    //       basePath: `${formBasePath}/${id}`
    //     })
    //     return h.response({}).code(204)
    //   },
    //   options: {
    //     description: `${enabledString} Allows a form to be persisted (published) on the runner server. Requires previewMode to be set to true. See runner/README.md for details on environment variables`
    //   }
    // })

    // server.route({
    //   method: 'get',
    //   path: '/published/{id}',
    //   handler: (request: Request, h: ResponseToolkit) => {
    //     const { id } = request.params
    //     if (!previewMode) {
    //       request.logger.error(
    //         [`GET /published/${id}`, 'previewModeError'],
    //         disabledRouteDetailString
    //       )
    //       throw Boom.unauthorized('publishing is disabled')
    //     }

    //     const form = forms[id]
    //     if (!form) {
    //       return h.response({}).code(204)
    //     }

    //     const { values } = forms[id]
    //     return h.response(JSON.stringify({ id, values })).code(200)
    //   },
    //   options: {
    //     description: `${enabledString} Gets a published form, by form id. Requires previewMode to be set to true. See runner/README.md for details on environment variables`
    //   }
    // })

    // server.route({
    //   method: 'get',
    //   path: '/published',
    //   handler: (request: Request, h: ResponseToolkit) => {
    //     if (!previewMode) {
    //       request.logger.error(
    //         [`GET /published`, 'previewModeError'],
    //         disabledRouteDetailString
    //       )
    //       throw Boom.unauthorized('publishing is disabled.')
    //     }
    //     return h
    //       .response(
    //         JSON.stringify(
    //           Object.keys(forms).map(
    //             (key) =>
    //               new FormConfiguration(
    //                 key,
    //                 forms[key].name,
    //                 undefined,
    //                 forms[key].def.feedback?.feedbackForm
    //               )
    //           )
    //         )
    //       )
    //       .code(200)
    //   },
    //   options: {
    //     description: `${enabledString} Gets all published forms. Requires previewMode to be set to true. See runner/README.md for details on environment variables`
    //   }
    // })

    const { uploadService } = server.services([])

    const queryParamPreHandler = async (
      request: Request,
      h: ResponseToolkit
    ) => {
      const { query } = request
      const model = request.app.model
      const prePopFields = model.fieldsForPrePopulation
      const queryKeysLength = Object.keys(query).length
      const prePopFieldsKeysLength = Object.keys(prePopFields).length

      if (queryKeysLength === 0 || prePopFieldsKeysLength === 0) {
        return h.continue
      }

      const { cacheService } = request.services([])
      const state = await cacheService.getState(request)
      const newValues = getValidStateFromQueryParameters(
        prePopFields,
        query,
        state
      )

      await cacheService.mergeState(request, newValues)

      return h.continue
    }

    const loadFormPreHandler = async (request: Request, h: ResponseToolkit) => {
      if (server.app.model) {
        request.app.model = server.app.model

        return h.continue
      }

      const { params, path } = request
      const { slug } = params
      const isPreview = path.toLowerCase().startsWith(PREVIEW_PATH_PREFIX)
      const formState = isPreview ? params.state : 'live'

      // Get the form metadata using the `slug` param
      const metadata = await getFormMetadata(slug)

      const { id, [formState]: state } = metadata

      // Check the metadata supports the requested state
      if (!state) {
        return Boom.notFound(`No '${formState}' state for form metadata ${id}`)
      }

      const key = `${id}_${formState}`
      let item = itemCache.get(key)

      if (!item || !isEqual(item.updatedAt, state.updatedAt)) {
        server.logger.info(
          `Getting form definition ${id} (${slug}) ${formState}`
        )

        // Get the form definition using the `id` from the metadata
        const definition = await getFormDefinition(id, formState)

        if (!definition) {
          return Boom.notFound(
            `No definition found for form metadata ${id} (${slug}) ${formState}`
          )
        }

        // Generate the form model and add it to the item cache
        server.logger.info(
          `Building model for form definition ${id} (${slug}) ${formState}`
        )

        const basePath = isPreview
          ? `${PREVIEW_PATH_PREFIX.substring(1)}/${params.state}/${slug}`
          : slug

        const model = new FormModel(definition, {
          basePath,
          ...modelOptions
        })

        // Create new cache item
        item = { model, updatedAt: state.updatedAt }
        itemCache.set(key, item)
      }

      // Assign the model to the request data
      // for use in the downstream handler
      request.app.model = item.model

      return h.continue
    }

    const dispatchHandler = (request: Request, h: ResponseToolkit) => {
      const { slug } = request.params
      const model = request.app.model

      return getStartPageRedirect(request, h, slug, model)
    }

    const getHandler = (request: Request, h: ResponseToolkit) => {
      const { path, slug } = request.params
      const model = request.app.model
      const page = model.pages.find(
        (page) => normalisePath(page.path) === normalisePath(path)
      )

      if (page) {
        // NOTE: Start pages should live on gov.uk, but this allows prototypes to include signposting about having to log in.
        if (
          page.pageDef.controller !== './pages/start.js' &&
          shouldLogin(request)
        ) {
          return h.redirect(`/login?returnUrl=${request.path}`)
        }

        return page.makeGetRouteHandler()(request, h)
      }

      if (normalisePath(path) === '') {
        return getStartPageRedirect(request, h, slug, model)
      }

      throw Boom.notFound('No form or page found')
    }

    const handleFiles = (request: Request, h: ResponseToolkit) => {
      const { path, id } = request.params
      const model = request.app.model
      const page = model?.pages.find(
        (page) => normalisePath(page.path) === normalisePath(path)
      )

      return uploadService.handleUploadRequest(request, h, page.pageDef)
    }

    const postHandler = (request: Request, h: ResponseToolkit) => {
      const { path, id } = request.params
      const model = request.app.model
      const page = model.pages.find(
        (page) => page.path.replace(/^\//, '') === path
      )

      if (page) {
        return page.makePostRouteHandler()(request, h)
      }
    }

    const dispatchRouteOptions = {
      pre: [
        {
          method: loadFormPreHandler
        },
        {
          method: queryParamPreHandler
        }
      ]
    }

    server.route({
      method: 'get',
      path: '/{slug}',
      handler: dispatchHandler,
      options: {
        ...dispatchRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema
          })
        }
      }
    })

    server.route({
      method: 'get',
      path: '/preview/{state}/{slug}',
      handler: dispatchHandler,
      options: {
        ...dispatchRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            state: stateSchema
          })
        }
      }
    })

    const getRouteOptions = {
      pre: [
        {
          method: loadFormPreHandler
        },
        {
          method: queryParamPreHandler
        }
      ]
    }

    server.route({
      method: 'get',
      path: '/{slug}/{path*}',
      handler: getHandler,
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema
          })
        }
      }
    })

    server.route({
      method: 'get',
      path: '/preview/{state}/{slug}/{path*}',
      handler: getHandler,
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema,
            state: stateSchema
          })
        }
      }
    })

    const postRouteOptions = {
      plugins: {
        'hapi-rate-limit': {
          userPathLimit: 10
        }
      } as PluginSpecificConfiguration,
      payload: {
        output: 'stream',
        parse: true,
        multipart: { output: 'stream' },
        maxBytes: uploadService.fileSizeLimit,
        failAction: (request: Request, h: ResponseToolkit) => {
          request.server.plugins.crumb.generate?.(request, h)
          return h.continue
        }
      },
      pre: [{ method: loadFormPreHandler }, { method: handleFiles }]
    }

    server.route({
      method: 'post',
      path: '/{slug}/{path*}',
      handler: postHandler,
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema
          })
        }
      }
    })

    server.route({
      method: 'post',
      path: '/preview/{state}/{slug}/{path*}',
      handler: postHandler,
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema,
            path: pathSchema
          })
        }
      }
    })
  }
}
