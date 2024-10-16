import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
  type Plugin,
  type ResponseToolkit,
  type RouteOptions
} from '@hapi/hapi'
import { isEqual } from 'date-fns'
import Joi from 'joi'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  ADD_ANOTHER,
  CONTINUE,
  checkFormStatus,
  redirectTo
} from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/plugins/engine/services/formsService.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'

function normalisePath(path: string) {
  return path.replace(/^\//, '').replace(/\/$/, '')
}

function getPage(request: FormRequest | FormRequestPayload) {
  const { model } = request.app
  const { path } = request.params

  return model?.pages.find(
    (page) => normalisePath(page.path) === normalisePath(path)
  )
}

function getStartPageRedirect(
  h: ResponseToolkit<FormRequestRefs>,
  model?: FormModel
) {
  const startPage = normalisePath(model?.def.startPage ?? '')

  if (startPage.startsWith('http') || !model?.basePath) {
    return redirectTo(h, startPage)
  }

  return redirectTo(h, `/${model.basePath}/${startPage}`)
}

export interface PluginOptions {
  model?: FormModel
  modelOptions?: ConstructorParameters<typeof FormModel>[1]
}

const stateSchema = Joi.string().valid('draft', 'live').required()
const pathSchema = Joi.string().required()
const itemIdSchema = Joi.string().uuid().required()
const crumbSchema = Joi.string().optional().allow('')
const actionSchema = Joi.string().valid(ADD_ANOTHER, CONTINUE).required()
const confirmSchema = Joi.boolean().default(false)

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
      request: FormRequest | FormRequestPayload,
      h:
        | ResponseToolkit<FormRequestRefs>
        | ResponseToolkit<FormRequestPayloadRefs>
    ) => {
      if (server.app.model) {
        request.app.model = server.app.model

        return h.continue
      }

      const { params, path } = request
      const { slug } = params
      const { isPreview } = checkFormStatus(path)
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
      request: FormRequest,
      h: ResponseToolkit<FormRequestRefs>
    ) => {
      const { model } = request.app
      return getStartPageRedirect(h, model)
    }

    const getHandler = (
      request: FormRequest,
      h: ResponseToolkit<FormRequestRefs>
    ) => {
      const { model } = request.app
      const { path } = request.params
      const page = getPage(request)

      if (page) {
        return page.makeGetRouteHandler()(request, h)
      }

      if (normalisePath(path) === '') {
        return getStartPageRedirect(h, model)
      }

      throw Boom.notFound('No form or page found')
    }

    const postHandler = (
      request: FormRequestPayload,
      h: ResponseToolkit<FormRequestPayloadRefs>
    ) => {
      const page = getPage(request)

      if (page) {
        return page.makePostRouteHandler()(request, h)
      }

      throw Boom.notFound('No form or page found')
    }

    const dispatchRouteOptions: RouteOptions<FormRequestRefs> = {
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
            state: stateSchema,
            slug: slugSchema
          })
        }
      }
    })

    const getRouteOptions: RouteOptions<FormRequestRefs> = {
      pre: [
        {
          method: loadFormPreHandler
        }
      ]
    }

    server.route({
      method: 'get',
      path: '/{slug}/{path}/{itemId?}',
      handler: getHandler,
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema,
            itemId: Joi.string().uuid()
          })
        }
      }
    })

    server.route({
      method: 'get',
      path: '/preview/{state}/{slug}/{path}/{itemId?}',
      handler: getHandler,
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema,
            path: pathSchema,
            itemId: Joi.string().uuid()
          })
        }
      }
    })

    const postRouteOptions: RouteOptions<FormRequestPayloadRefs> = {
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
      path: '/{slug}/{path}/{itemId?}',
      handler: postHandler,
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema,
            itemId: Joi.string().uuid()
          })
        }
      }
    })

    server.route({
      method: 'post',
      path: '/preview/{state}/{slug}/{path}/{itemId?}',
      handler: postHandler,
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema,
            path: pathSchema,
            itemId: Joi.string().uuid()
          })
        }
      }
    })

    /**
     * "AddAnother" repeat routes
     */

    // List summary GET route
    const getListSummaryHandler = (
      request: FormRequest,
      h: ResponseToolkit<FormRequestRefs>
    ) => {
      const page = getPage(request)

      if (page && page instanceof RepeatPageController) {
        return page.makeGetListSummaryRouteHandler()(request, h)
      }

      throw Boom.notFound('No form or page found')
    }

    server.route({
      method: 'get',
      path: '/{slug}/{path}/summary',
      handler: getListSummaryHandler,
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
      path: '/preview/{state}/{slug}/{path}/summary',
      handler: getListSummaryHandler,
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema,
            path: pathSchema
          })
        }
      }
    })

    // List summary POST route
    const postListSummaryHandler = (
      request: FormRequestPayload,
      h: ResponseToolkit<FormRequestPayloadRefs>
    ) => {
      const page = getPage(request)

      if (page && page instanceof RepeatPageController) {
        return page.makePostListSummaryRouteHandler()(request, h)
      }

      throw Boom.notFound('No form or page found')
    }

    server.route({
      method: 'post',
      path: '/{slug}/{path}/summary',
      handler: postListSummaryHandler,
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema
          }),
          payload: Joi.object()
            .keys({
              crumb: crumbSchema,
              action: actionSchema
            })
            .required()
        }
      }
    })

    server.route({
      method: 'post',
      path: '/preview/{state}/{slug}/{path}/summary',
      handler: postListSummaryHandler,
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema,
            path: pathSchema
          }),
          payload: Joi.object()
            .keys({
              crumb: crumbSchema,
              action: actionSchema
            })
            .required()
        }
      }
    })

    // List delete GET route
    const getListDeleteHandler = (
      request: FormRequest,
      h: ResponseToolkit<FormRequestRefs>
    ) => {
      const page = getPage(request)

      if (page && page instanceof RepeatPageController) {
        return page.makeGetListDeleteRouteHandler()(request, h)
      }

      throw Boom.notFound('No form or page found')
    }

    server.route({
      method: 'get',
      path: '/{slug}/{path}/{itemId}/confirm-delete',
      handler: getListDeleteHandler,
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema,
            itemId: itemIdSchema
          })
        }
      }
    })

    server.route({
      method: 'get',
      path: '/preview/{state}/{slug}/{path}/{itemId}/confirm-delete',
      handler: getListDeleteHandler,
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema,
            path: pathSchema,
            itemId: itemIdSchema
          })
        }
      }
    })

    // List delete POST route
    const postListDeleteHandler = (
      request: FormRequestPayload,
      h: ResponseToolkit<FormRequestPayloadRefs>
    ) => {
      const page = getPage(request)

      if (page && page instanceof RepeatPageController) {
        return page.makePostListDeleteRouteHandler()(request, h)
      }

      throw Boom.notFound('No form or page found')
    }

    server.route({
      method: 'post',
      path: '/{slug}/{path}/{itemId}/confirm-delete',
      handler: postListDeleteHandler,
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema,
            itemId: itemIdSchema
          }),
          payload: Joi.object()
            .keys({
              crumb: crumbSchema,
              confirm: confirmSchema
            })
            .required()
        }
      }
    })

    server.route({
      method: 'post',
      path: '/preview/{state}/{slug}/{path}/{itemId}/confirm-delete',
      handler: postListDeleteHandler,
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema,
            path: pathSchema,
            itemId: itemIdSchema
          }),
          payload: Joi.object()
            .keys({
              crumb: crumbSchema,
              confirm: confirmSchema
            })
            .required()
        }
      }
    })
  }
} satisfies Plugin<PluginOptions>
