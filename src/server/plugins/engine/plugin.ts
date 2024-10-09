import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
  type Plugin,
  type PluginSpecificConfiguration,
  type Request,
  type ResponseObject,
  type ResponseToolkit,
  type RouteOptions
} from '@hapi/hapi'
import { isEqual } from 'date-fns'
import Joi from 'joi'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  checkIfPreview,
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
  model: FormModel
) {
  const startPage = normalisePath(model.def.startPage ?? '')
  let startPageRedirect: ResponseObject

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

export interface PluginOptions {
  model?: FormModel
  modelOptions?: ConstructorParameters<typeof FormModel>[1]
}

const stateSchema = Joi.string().valid('draft', 'live').required()
const pathSchema = Joi.string().required()

export const plugin = {
  name: '@defra/forms-runner/engine',
  dependencies: '@hapi/vision',
  multiple: true,
  register(server, options) {
    const { model, modelOptions } = options

    server.app.model = model

    // In-memory cache of FormModel items, exposed
    // (for testing purposes) through `server.app.models`
    const itemCache = new Map<string, { model: FormModel; updatedAt: Date }>()
    server.app.models = itemCache

    const loadFormPreHandler = async (
      request: Request<{
        Params: {
          slug: string
          state?: 'draft' | 'live'
        }
      }>,
      h: ResponseToolkit
    ) => {
      if (server.app.model) {
        request.app.model = server.app.model

        return h.continue
      }

      const { params, path } = request
      const { slug } = params
      const isPreview = checkIfPreview(path)
      const formState = isPreview && params.state ? params.state : 'live'

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

        const emailAddress =
          metadata.notificationEmail ?? definition.outputEmail

        if (!emailAddress && !isPreview) {
          return Boom.internal(
            'An email address is required to complete the form submission'
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

    const dispatchHandler = (
      request: Request<{
        Params: {
          slug: string
          state?: 'draft' | 'live'
        }
      }>,
      h: ResponseToolkit
    ) => {
      const { model } = request.app
      return getStartPageRedirect(request, h, model)
    }

    const getHandler = (
      request: Request<{
        Params: {
          path: string
          slug: string
          state: 'draft' | 'live'
        }
      }>,
      h: ResponseToolkit
    ) => {
      const { model } = request.app
      const { path } = request.params

      const page = model?.pages.find(
        (page) => normalisePath(page.path) === normalisePath(path)
      )

      if (page) {
        return page.makeGetRouteHandler()(request, h)
      }

      if (normalisePath(path) === '') {
        return getStartPageRedirect(request, h, model)
      }

      throw Boom.notFound('No form or page found')
    }

    const postHandler = (request: Request, h: ResponseToolkit) => {
      const { path } = request.params
      const model = request.app.model
      const page = model?.pages.find(
        (page) => page.path.replace(/^\//, '') === path
      )

      if (page) {
        return page.makePostRouteHandler()(request, h)
      }
    }

    const dispatchRouteOptions: RouteOptions = {
      pre: [
        {
          method: loadFormPreHandler
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

    const getRouteOptions: RouteOptions = {
      pre: [
        {
          method: loadFormPreHandler
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

    const postRouteOptions: RouteOptions = {
      plugins: {
        'hapi-rate-limit': {
          userPathLimit: 10
        }
      } as PluginSpecificConfiguration,
      payload: {
        parse: true,
        failAction: (request, h) => {
          request.server.plugins.crumb.generate?.(request, h)
          return h.continue
        }
      },
      pre: [{ method: loadFormPreHandler }]
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
} satisfies Plugin<PluginOptions>
