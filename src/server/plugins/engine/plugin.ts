import { hasFormComponents, slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
  type Plugin,
  type ResponseObject,
  type ResponseToolkit,
  type RouteOptions
} from '@hapi/hapi'
import { isEqual } from 'date-fns'
import Joi from 'joi'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  checkEmailAddressForLiveFormSubmission,
  checkFormStatus,
  findPage,
  getPage,
  getStartPath,
  normalisePath,
  proceed,
  redirectPath
} from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { FileUploadPageController } from '~/src/server/plugins/engine/pageControllers/FileUploadPageController.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/plugins/engine/services/formsService.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'
import {
  actionSchema,
  confirmSchema,
  crumbSchema,
  itemIdSchema,
  pathSchema,
  stateSchema
} from '~/src/server/schemas/index.js'
import { type Services } from '~/src/server/types.js'

export interface PluginOptions {
  model?: FormModel
  services?: Services
}

export const plugin = {
  name: '@defra/forms-runner/engine',
  dependencies: '@hapi/vision',
  multiple: true,
  register(server, options) {
    const { model, services } = options

    server.app.model = model

    // In-memory cache of FormModel items, exposed
    // (for testing purposes) through `server.app.models`
    const itemCache = new Map<string, { model: FormModel; updatedAt: Date }>()
    server.app.models = itemCache

    const loadFormPreHandler = async (
      request: FormRequest | FormRequestPayload,
      h: Pick<ResponseToolkit, 'continue'>
    ) => {
      if (server.app.model) {
        request.app.model = server.app.model

        return h.continue
      }

      const { params, path } = request
      const { slug } = params
      const { isPreview, state: formState } = checkFormStatus(path)

      // Get the form metadata using the `slug` param
      const metadata = await getFormMetadata(slug)

      const { id, [formState]: state } = metadata

      // Check the metadata supports the requested state
      if (!state) {
        throw Boom.notFound(`No '${formState}' state for form metadata ${id}`)
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
          throw Boom.notFound(
            `No definition found for form metadata ${id} (${slug}) ${formState}`
          )
        }

        const emailAddress =
          metadata.notificationEmail ?? definition.outputEmail

        checkEmailAddressForLiveFormSubmission(emailAddress, isPreview)

        // Build the form model
        server.logger.info(
          `Building model for form definition ${id} (${slug}) ${formState}`
        )

        // Set up the basePath for the model
        const basePath = isPreview
          ? `${PREVIEW_PATH_PREFIX.substring(1)}/${formState}/${slug}`
          : slug

        // Construct the form model
        const model = new FormModel(definition, { basePath }, services)

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
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { model } = request.app

      const servicePath = model ? `/${model.basePath}` : ''
      return proceed(request, h, `${servicePath}${getStartPath(model)}`)
    }

    const redirectOrMakeHandler = async (
      request: FormRequest | FormRequestPayload,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>,
      makeHandler: (
        page: PageControllerClass,
        context: FormContext
      ) => ResponseObject | Promise<ResponseObject>
    ) => {
      const { app, params } = request
      const { model } = app

      if (!model) {
        throw Boom.notFound(`No model found for /${params.path}`)
      }

      const page = getPage(model, request)
      const state = await page.getState(request)
      const context = model.getFormContext(request, state)

      const relevantPath = page.getRelevantPath(request, context)
      const summaryPath = page.getSummaryPath()

      // Return handler for relevant pages or preview URL direct access
      if (relevantPath.startsWith(page.path) || context.isForceAccess) {
        return makeHandler(page, context)
      }

      // Redirect back to last relevant page
      const redirectTo = findPage(model, relevantPath)

      // Set the return URL unless an exit page
      if (redirectTo?.next.length) {
        request.query.returnUrl = page.getHref(summaryPath)
      }

      return proceed(request, h, page.getHref(relevantPath))
    }

    const getHandler = (
      request: FormRequest,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { params } = request

      if (normalisePath(params.path) === '') {
        return dispatchHandler(request, h)
      }

      return redirectOrMakeHandler(request, h, (page, context) =>
        page.makeGetRouteHandler()(request, context, h)
      )
    }

    const postHandler = (
      request: FormRequestPayload,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { query } = request

      return redirectOrMakeHandler(request, h, (page, context) => {
        const { pageDef } = page
        const { isForceAccess } = context

        // Redirect to GET for preview URL direct access
        if (isForceAccess && !hasFormComponents(pageDef)) {
          return proceed(request, h, redirectPath(page.href, query))
        }

        return page.makePostRouteHandler()(request, context, h)
      })
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
            itemId: itemIdSchema.optional()
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
            itemId: itemIdSchema.optional()
          })
        }
      }
    })

    const postRouteOptions: RouteOptions<FormRequestPayloadRefs> = {
      payload: {
        parse: true
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
            itemId: itemIdSchema.optional()
          }),
          payload: Joi.object()
            .keys({
              crumb: crumbSchema,
              action: actionSchema
            })
            .unknown(true)
            .required()
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
            itemId: itemIdSchema.optional()
          }),
          payload: Joi.object()
            .keys({
              crumb: crumbSchema,
              action: actionSchema
            })
            .unknown(true)
            .required()
        }
      }
    })

    /**
     * "AddAnother" repeat routes
     */

    // List summary GET route
    const getListSummaryHandler = (
      request: FormRequest,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { params } = request

      return redirectOrMakeHandler(request, h, (page, context) => {
        if (!(page instanceof RepeatPageController)) {
          throw Boom.notFound(`No repeater page found for /${params.path}`)
        }

        return page.makeGetListSummaryRouteHandler()(request, context, h)
      })
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
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { params } = request

      return redirectOrMakeHandler(request, h, (page, context) => {
        const { isForceAccess } = context

        if (isForceAccess || !(page instanceof RepeatPageController)) {
          throw Boom.notFound(`No repeater page found for /${params.path}`)
        }

        return page.makePostListSummaryRouteHandler()(request, context, h)
      })
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

    // Item delete GET route
    const getItemDeleteHandler = (
      request: FormRequest,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { params } = request

      return redirectOrMakeHandler(request, h, (page, context) => {
        if (
          !(
            page instanceof RepeatPageController ||
            page instanceof FileUploadPageController
          )
        ) {
          throw Boom.notFound(`No page found for /${params.path}`)
        }

        return page.makeGetItemDeleteRouteHandler()(request, context, h)
      })
    }

    server.route({
      method: 'get',
      path: '/{slug}/{path}/{itemId}/confirm-delete',
      handler: getItemDeleteHandler,
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
      handler: getItemDeleteHandler,
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

    // Item delete POST route
    const postItemDeleteHandler = (
      request: FormRequestPayload,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { params } = request

      return redirectOrMakeHandler(request, h, (page, context) => {
        const { isForceAccess } = context

        if (
          isForceAccess ||
          !(
            page instanceof RepeatPageController ||
            page instanceof FileUploadPageController
          )
        ) {
          throw Boom.notFound(`No page found for /${params.path}`)
        }

        return page.makePostItemDeleteRouteHandler()(request, context, h)
      })
    }

    server.route({
      method: 'post',
      path: '/{slug}/{path}/{itemId}/confirm-delete',
      handler: postItemDeleteHandler,
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
              action: actionSchema,
              confirm: confirmSchema
            })
            .required()
        }
      }
    })

    server.route({
      method: 'post',
      path: '/preview/{state}/{slug}/{path}/{itemId}/confirm-delete',
      handler: postItemDeleteHandler,
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
              action: actionSchema,
              confirm: confirmSchema
            })
            .required()
        }
      }
    })
  }
} satisfies Plugin<PluginOptions>
