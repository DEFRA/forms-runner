import { isOfflineBoom } from '@defra/forms-engine-plugin'
import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'
import { stateSchema } from '@defra/forms-engine-plugin/schema.js'
import { FormStatus, slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import { config } from '~/src/config/index.js'
import { CITIZEN_SESSION } from '~/src/server/auth/scheme.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { EN_GB } from '~/src/server/constants.js'
import { createJoiError } from '~/src/server/helpers/error-helper.js'
import {
  getCachedFormTranslatorBasic,
  getCachedFormTranslatorExternalRoutes
} from '~/src/server/i18n/form.js'
import {
  publishSaveAndExitV1Event,
  publishSaveAndExitV2Event
} from '~/src/server/messaging/publish.js'
import { confirmationViewModelv2 } from '~/src/server/models/save-and-exit-v2.js'
import {
  confirmationViewModel,
  detailsViewModel,
  getKey,
  paramsSchema,
  payloadSchema,
  resumeErrorViewModel,
  resumeSuccessViewModel
} from '~/src/server/models/save-and-exit.js'
import { selectResumeStrategy } from '~/src/server/resume/index.js'
import { restoreState, showResumeError } from '~/src/server/resume/outcomes.js'
import { hasState } from '~/src/server/routes/save-and-exit-helper.js'
import { stateHandler } from '~/src/server/routes/save-and-exit-state-handler.js'
import { getFormMetadataWithGuard } from '~/src/server/services/formMetadataGuards.js'
import { getFormDefinitionWithFallback } from '~/src/server/services/helpers/formsServiceHelper.js'
import { getMagicLinkForm } from '~/src/server/services/magicLinkForm.js'
import { getSaveAndExitDetails } from '~/src/server/services/submissionService.js'
import {
  isLanguageSupported,
  resolveLanguage
} from '~/src/server/utils/utils.js'

export const maxInvalidPasswordAttempts = 5

const ERROR_BASE_URL = '/resume-form-error'

// View paths
const SAVE_AND_EXIT_DETAILS = 'save-and-exit/details'
const RESUME_ERROR = 'save-and-exit/resume-error'
const RESUME_SUCCESS = 'save-and-exit/resume-success'
const SAVE_AND_EXIT_CONFIRMATION = 'save-and-exit-v2/confirmation'

/**
 * A response without a count is malformed. Treat it as every attempt already
 * used, so a missing count locks the form rather than reopening it.
 * @param {number | undefined} attemptsSoFar
 */
export function getPasswordAttemptsLeft(attemptsSoFar) {
  return (
    maxInvalidPasswordAttempts - (attemptsSoFar ?? maxInvalidPasswordAttempts)
  )
}

/**
 * @param {Partial<{ errors?: { text: string, href: string }[]}>} model
 * @param {{ href: string, text: string }} error
 */
export function addError(model, error) {
  if (model.errors) {
    model.errors.push(error)
  } else {
    model.errors = [error]
  }
  return model
}

/**
 *
 * @param {{ query: RequestQuery, yar: Yar }} request
 * @param {FormMetadata} metadata - the metadata of the form
 * @param {FormStatus} status
 * @returns {Promise<{ translator: Translator, language: string }>}
 */
export async function getFormTranslator(
  request,
  metadata,
  status = metadata.live ? FormStatus.Live : FormStatus.Draft
) {
  let language = resolveLanguage(request.query, request.yar)

  if (language !== EN_GB) {
    const definition = await getFormDefinitionWithFallback(metadata.id, status)

    if (!isLanguageSupported(language, definition)) {
      // If not translations defined in the FormDefinition, always default to English
      language = EN_GB
    }
  }

  const translator = await getCachedFormTranslatorExternalRoutes(
    metadata,
    status,
    language
  )

  return { translator, language }
}

/**
 * Handle V1 save-and exit initial route
 * @param {Request<{ Params: SaveAndExitParams }>} request
 * @param {ResponseToolkit<{ Params: SaveAndExitParams }>} h
 */
async function handlerMemorableWordSaveAndExit(request, h) {
  const { params } = request
  const { slug, state: status } = params
  const metadata = await getFormMetadataWithGuard(slug, status)
  const { translator } = await getFormTranslator(request, metadata, status)

  const model = detailsViewModel(
    metadata,
    translator,
    status,
    undefined,
    undefined
  )

  // Store any outstanding data from the current page in a special attribute
  // (in case the current page wasn't yet validated and saved).
  // Handle the user navigating back from previously submitting a save-and-exit. The state has been cleared
  // so just show the form from the start
  if (await stateHandler(request)) {
    return h.redirect(model.serviceUrl)
  }

  // Clear any previous save and exit session state
  request.yar.clear(getKey(slug, status))

  return h
    .view(SAVE_AND_EXIT_DETAILS, model)
    .header('Cache-Control', 'no-cache, no-store, must-revalidate')
}

/**
 * Handle V2 save-and exit route
 * @param {Request<{ Params: SaveAndExitParams }>} request
 * @param {ResponseToolkit<{ Params: SaveAndExitParams }>} h
 */
async function handleAuthenticatedSaveAndExit(request, h) {
  const { params, auth } = request
  const { slug, state: status } = params
  const metadata = await getFormMetadataWithGuard(slug, status)
  const { translator } = await getFormTranslator(request, metadata, status)

  const model = confirmationViewModelv2(metadata, translator, status)

  const cacheService = getCacheService(
    /** @type {AnyRequest} */ (/** @type {unknown} */ (request)).server
  )

  // Store any outstanding data from the current page in a special attribute
  // (in case the current page wasn't yet validated and saved).
  // Handle the user navigating back from previously submitting a save-and-exit. The state has been cleared
  // so just show the form from the start
  if (await stateHandler(request)) {
    return h.redirect(model.serviceUrl)
  }

  await publishSaveAndExitV2Event(
    metadata.id,
    metadata.title,
    auth.credentials.email,
    {
      sub: auth.credentials.sub,
      issuer: auth.credentials.iss
    },
    await cacheService.getState(/** @type {CacheRequest} */ (request)),
    status
  )

  // Clear any previous save and exit session state
  request.yar.clear(getKey(slug, status))
  await cacheService.clearState(request)

  return h
    .view(SAVE_AND_EXIT_CONFIRMATION, model)
    .header('Cache-Control', 'no-cache, no-store, must-revalidate')
}

export default [
  /**
   * @satisfies {ServerRoute<{ Params: SaveAndExitParams }>}
   */
  ({
    method: 'GET',
    path: '/save-and-exit/{slug}/{state?}',
    handler(request, h) {
      return config.get('useSignInFeature')
        ? handleAuthenticatedSaveAndExit(request, h)
        : handlerMemorableWordSaveAndExit(request, h)
    },
    options: {
      validate: {
        params: paramsSchema
      },
      ...(config.get('useSignInFeature')
        ? { auth: { mode: 'required', strategy: CITIZEN_SESSION } }
        : {})
    }
  }),
  /**
   * @satisfies {ServerRoute<{ Params: SaveAndExitParams, Payload: SaveAndExitPayload }>}
   */
  ({
    method: 'POST',
    path: '/save-and-exit/{slug}/{state?}',
    async handler(request, h) {
      const { params, payload } = request
      const { slug, state: status } = params
      const { email, securityQuestion, securityAnswer } = payload

      // Throws the offline marker BEFORE publishSaveAndExitEvent so we never
      // emit a magic-link email for a form the user can no longer reach.
      const metadata = await getFormMetadataWithGuard(slug, status)
      const cacheService = getCacheService(request.server)

      // Publish topic message
      const security = {
        question: securityQuestion,
        answer: securityAnswer
      }
      const state = await cacheService.getState(
        /** @type {CacheRequest} */ (request)
      )

      const statusPath = status ? `/${status}` : ''

      // Handle the user navigating back from previously submitting a save-and-exit. The state has been cleared
      // so we need to warn the user
      if (!hasState(state)) {
        const { translator } = await getFormTranslator(
          request,
          metadata,
          status
        )
        const { t } = translator
        const model = detailsViewModel(
          metadata,
          translator,
          status,
          /** @type {SaveAndExitPayload} */ (payload),
          createJoiError(
            'general',
            /** @type {string} */ (
              t('saveAndExit.details.validation.stateExpired')
            )
          )
        )
        return h.view(SAVE_AND_EXIT_DETAILS, model).takeover()
      }

      await publishSaveAndExitV1Event(
        metadata.id,
        metadata.title,
        email,
        security,
        state,
        status
      )

      // Clear all form data
      await cacheService.clearState(/** @type {CacheRequest} */ (request))

      // Add email to session for the confirmation page
      request.yar.set(getKey(slug, status), email)

      // Redirect to the save and exit confirmation page
      return h.redirect(`/save-and-exit/${slug}/confirmation${statusPath}`)
    },
    options: {
      validate: {
        async failAction(request, h, err) {
          const { params, payload } = request
          const { slug, state: status } = /** @type {SaveAndExitParams} */ (
            params
          )
          const metadata = await getFormMetadataWithGuard(slug, status)
          const { translator } = await getFormTranslator(
            request,
            metadata,
            status
          )

          const model = detailsViewModel(
            metadata,
            translator,
            status,
            /** @type {SaveAndExitPayload} */ (payload),
            err
          )

          return h.view(SAVE_AND_EXIT_DETAILS, model).takeover()
        },
        params: paramsSchema,
        payload: payloadSchema
      }
    }
  }),
  /**
   * @satisfies {ServerRoute<{ Params: SaveAndExitParams }>}
   */
  ({
    method: 'GET',
    path: '/save-and-exit/{slug}/confirmation/{state?}',
    async handler(request, h) {
      const { params } = request
      const { slug, state: status } = params

      const metadata = await getFormMetadataWithGuard(slug, status)
      const { translator } = await getFormTranslator(request, metadata, status)

      // Get the email from session
      const email = /** @type {string} */ (
        request.yar.get(getKey(slug, status))
      )

      if (!email) {
        return Boom.badRequest('No email found in session cache')
      }

      const model = confirmationViewModel(metadata, email, translator, status)

      return h.view('save-and-exit/confirmation', model)
    },
    options: {
      validate: {
        params: paramsSchema
      }
    }
  }),
  /**
   * @satisfies {ServerRoute<{ Params: { formId: string, magicLinkId: string } }>}
   */
  ({
    method: 'GET',
    path: '/resume-form/{formId}/{magicLinkId}',
    async handler(request, h) {
      const { params } = request
      const { formId, magicLinkId } = params

      const form = await getMagicLinkForm(formId, magicLinkId)

      if (!form) {
        return h.redirect(ERROR_BASE_URL).code(StatusCodes.SEE_OTHER)
      }

      // Check magic link id
      let linkDetails
      try {
        linkDetails = await getSaveAndExitDetails(magicLinkId)

        if (!linkDetails) {
          throw new Error('No link found')
        }
      } catch (err) {
        const error = /** @type {BoomErrorCustomSaveAndExit} */ (err)
        if (error.output?.statusCode === StatusCodes.GONE) {
          const latestLinkId = error.data?.payload?.latestId
          if (latestLinkId) {
            logger.info(
              `Old link ${magicLinkId} used but redirected to ${latestLinkId}`
            )
            return h
              .redirect(`/resume-form/${formId}/${latestLinkId}`)
              .code(StatusCodes.SEE_OTHER)
          } else {
            return h
              .redirect(`${ERROR_BASE_URL}/${form.slug}`)
              .code(StatusCodes.SEE_OTHER)
          }
        }
        logger.error(
          err,
          `Invalid magic link id ${magicLinkId} with form id ${formId}`
        )
      }

      if (!linkDetails) {
        return h
          .redirect(`${ERROR_BASE_URL}/${form.slug}`)
          .code(StatusCodes.SEE_OTHER)
      }

      if (form.id !== linkDetails.form.id) {
        return h
          .redirect(`${ERROR_BASE_URL}/${form.slug}`)
          .code(StatusCodes.SEE_OTHER)
      }

      const { isPreview, status } = linkDetails.form

      const slugAndState = isPreview ? `/${status}` : ''

      /** @type {ResumeContext} */
      const context = {
        form,
        details: linkDetails,
        formId,
        magicLinkId,
        slugAndState
      }

      // The strategy and outcome functions take the plain hapi Request and
      // ResponseToolkit, so they work the same whichever route calls them.
      const genericRequest = /** @type {Request} */ (
        /** @type {unknown} */ (request)
      )
      const genericH = /** @type {ResponseToolkit} */ (
        /** @type {unknown} */ (h)
      )

      const outcome = await selectResumeStrategy(linkDetails).start(
        genericRequest,
        context
      )

      switch (outcome.kind) {
        case 'resume':
          return restoreState(genericRequest, genericH, outcome, context)
        case 'redirect':
          return h.redirect(outcome.location)
        default:
          return showResumeError(genericH, context)
      }
    },
    options: {
      validate: {
        params: Joi.object()
          .keys({
            formId: Joi.string().required(),
            magicLinkId: Joi.string().uuid().required()
          })
          .required()
      }
    }
  }),
  /**
   * @satisfies {ServerRoute<{ Params: { slug: string } }>}
   */
  ({
    method: 'GET',
    path: '/resume-form-error/{slug?}',
    async handler(request, h) {
      const { params } = request
      const { slug } = params
      let metadata

      if (slug) {
        try {
          metadata = await getFormMetadataWithGuard(slug, FormStatus.Live)
        } catch (err) {
          if (isOfflineBoom(err)) {
            throw err
          }
          // Fall through to the existing error view if metadata can't be fetched.
          logger.info(
            { err },
            `Could not load metadata for resume-form-error slug ${slug}; rendering generic error view`
          )
        }
      }

      let translator
      if (metadata) {
        ;({ translator } = await getFormTranslator(
          request,
          metadata,
          metadata.live ? FormStatus.Live : FormStatus.Draft
        ))
      } else {
        // If no metadata, fallback to the base translator
        const language = resolveLanguage(request.query, request.yar)

        translator = getCachedFormTranslatorBasic(
          'unknown',
          undefined,
          FormStatus.Live,
          language
        )
      }

      const model = resumeErrorViewModel({ slug }, translator)

      return h.view(RESUME_ERROR, model)
    },
    options: {
      validate: {
        params: Joi.object()
          .keys({
            slug: slugSchema.optional()
          })
          .required()
      }
    }
  }),
  /**
   * @satisfies {ServerRoute<{ Params: { slug: string, state?: FormStatus} }>}
   */
  ({
    method: 'GET',
    path: '/resume-form-success/{slug}/{state?}',
    async handler(request, h) {
      const { params } = request
      const { slug, state } = params
      const form = await getFormMetadataWithGuard(slug, state)
      const { translator } = await getFormTranslator(request, form, state)
      const model = resumeSuccessViewModel(form, translator, state)

      return h.view(RESUME_SUCCESS, model)
    },
    options: {
      validate: {
        params: Joi.object()
          .keys({
            slug: slugSchema,
            state: stateSchema.optional()
          })
          .required()
      }
    }
  })
]

/**
 * @import { ServerRoute, ResponseToolkit, Request, RequestQuery } from '@hapi/hapi'
 * @import { Yar } from '@hapi/yar'
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { Translator } from '@defra/forms-engine-plugin/engine/i18n/types.js'
 * @import { AnyRequest, CacheRequest } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { BoomErrorCustomSaveAndExit, SaveAndExitParams, SaveAndExitPayload } from '~/src/server/models/save-and-exit.js'
 * @import { ResumeContext } from '~/src/server/resume/types.js'
 */
