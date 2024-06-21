import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
  type PluginSpecificConfiguration,
  type Request,
  type ResponseToolkit,
  type Server
} from '@hapi/hapi'
import { isEqual } from 'date-fns'
import Joi from 'joi'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  getValidStateFromQueryParameters,
  redirectTo
} from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/plugins/engine/services/formsService.js'

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
  }
  model?: FormModel
}

const stateSchema = Joi.string().valid('draft', 'live').required()
const pathSchema = Joi.string().required()

export const plugin = {
  name: '@defra/forms-runner/engine',
  dependencies: '@hapi/vision',
  multiple: true,
  register: (server: Server, options: PluginOptions) => {
    const { model, modelOptions } = options

    server.app.model = model

    // In-memory cache of FormModel items, exposed
    // (for testing purposes) through `server.app.models`
    const itemCache = new Map()
    server.app.models = itemCache

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

      // Cache the models based on id, state and whether
      // it's a preview or not. There could be up to 3 models
      // cached for a single form:
      // "{id}_live_false" (live/live)
      // "{id}_live_true" (live/preview)
      // "{id}_draft_true" (draft/preview)
      const key = `${id}_${formState}_${isPreview}`
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

        const emailAddress = definition.outputEmail

        if (!emailAddress && !isPreview) {
          return Boom.internal(
            'An `outputEmail` is required on the form definition to complete the form submission'
          )
        }

        // Build the form model
        server.logger.info(
          `Building model for form definition ${id} (${slug}) ${formState}`
        )

        // Set up the basePath for the model
        const basePath = isPreview
          ? `${PREVIEW_PATH_PREFIX.substring(1)}/${formState}/${slug}`
          : slug

        // Construct the form model
        const model = new FormModel(definition, {
          basePath,
          ...modelOptions
        })

        // Create new item and add it to the item cache
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
      const { path } = request.params
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
