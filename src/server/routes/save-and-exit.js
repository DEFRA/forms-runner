import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'
import { stateSchema } from '@defra/forms-engine-plugin/schema.js'
import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { publishSaveAndExitEvent } from '~/src/server/messaging/publish.js'
import {
  confirmationViewModel,
  createInvalidPasswordError,
  detailsViewModel,
  getKey,
  lockedOutViewModel,
  paramsSchema,
  passwordViewModel,
  payloadSchema,
  resumeErrorViewModel,
  resumeParamsSchema,
  resumeSuccessViewModel,
  validatePayloadSchema
} from '~/src/server/models/save-and-exit.js'
import {
  getFormMetadata,
  getFormMetadataById,
  getSaveAndExitDetails,
  validateSaveAndExitCredentials
} from '~/src/server/services/formsService.js'
const logger = createLogger()

const maxInvalidPasswordAttempts = 5

const ERROR_BASE_URL = '/resume-form-error'

// View paths
const RESUME_ERROR = 'save-and-exit/resume-error'
const RESUME_ERROR_LOCKED = 'save-and-exit/resume-error-locked'
const RESUME_PASSWORD_PATH = 'save-and-exit/resume-password'
const RESUME_SUCCESS = 'save-and-exit/resume-success'

/**
 * @param {number} attemptsSoFar
 */
export function getPasswordAttemptsLeft(attemptsSoFar) {
  return maxInvalidPasswordAttempts - attemptsSoFar
}

export default [
  /**
   * @satisfies {ServerRoute<{ Params: SaveAndExitParams }>}
   */
  ({
    method: 'GET',
    path: '/save-and-exit/{slug}/{state?}',
    async handler(request, h) {
      const { params } = request
      const { slug, state: status } = params
      const metadata = await getFormMetadata(slug)
      const model = detailsViewModel(metadata, status)

      // Clear any previous save and exit session state
      request.yar.clear(getKey(slug, status))

      return h.view('save-and-exit/details', model)
    },
    options: {
      validate: {
        params: paramsSchema
      }
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
      const metadata = await getFormMetadata(slug)
      const cacheService = getCacheService(request.server)

      // Publish topic message
      const security = {
        question: securityQuestion,
        answer: securityAnswer
      }
      const state = await cacheService.getState(request)

      await publishSaveAndExitEvent(
        metadata.id,
        metadata.title,
        email,
        security,
        state,
        status
      )

      // Clear all form data
      await cacheService.clearState(request)

      // Add email to session for the confirmation page
      request.yar.set(getKey(slug, status), email)

      // Redirect to the save and exit confirmation page
      const statusPath = status ? `/${status}` : ''

      return h.redirect(`/save-and-exit/${slug}/confirmation${statusPath}`)
    },
    options: {
      validate: {
        async failAction(request, h, err) {
          const { params, payload } = request
          const { slug, state: status } = params
          const metadata = await getFormMetadata(slug)
          const model = detailsViewModel(
            metadata,
            status,
            /** @type {SaveAndExitPayload} */ (payload),
            err
          )

          return h.view('save-and-exit/details', model).takeover()
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
      const metadata = await getFormMetadata(slug)

      // Get the email from session
      const email = /** @type {string} */ (
        request.yar.get(getKey(slug, status))
      )

      if (!email) {
        return Boom.badRequest('No email found in session cache')
      }

      const model = confirmationViewModel(metadata, email, status)

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

      // Check form id
      let form
      try {
        form = await getFormMetadataById(formId)
      } catch (err) {
        logger.error(
          err,
          `Invalid formId ${formId} in magic link id ${magicLinkId}`
        )
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
        logger.error(
          err,
          `Invalid magic link id ${magicLinkId} with form id ${formId}`
        )
      }

      if (!linkDetails || form.id !== linkDetails.form.id) {
        return h
          .redirect(`${ERROR_BASE_URL}/${form.slug}`)
          .code(StatusCodes.SEE_OTHER)
      }

      const { isPreview, status } = linkDetails.form

      const slugAndState = isPreview ? `/${status}` : ''

      return h.redirect(
        `/resume-form-verify/${formId}/${magicLinkId}/${form.slug}${slugAndState}`
      )
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
   * @satisfies {ServerRoute<{ Params: SaveAndExitResumePasswordParams }>}
   */
  ({
    method: 'GET',
    path: '/resume-form-verify/{formId}/{magicLinkId}/{slug}/{state?}',
    async handler(request, h) {
      const { params } = request
      const { formId, magicLinkId } = params
      const resumeDetails = await getSaveAndExitDetails(magicLinkId)

      if (!resumeDetails) {
        return h.redirect(ERROR_BASE_URL)
      }

      // Check form id
      let form
      try {
        form = await getFormMetadataById(resumeDetails.form.id)
      } catch (err) {
        logger.error(
          err,
          `Invalid formId ${formId} in magic link id ${magicLinkId}`
        )
        return h.redirect(ERROR_BASE_URL)
      }

      const model = passwordViewModel(
        form.title,
        resumeDetails.question,
        getPasswordAttemptsLeft(resumeDetails.invalidPasswordAttempts)
      )

      return h.view(RESUME_PASSWORD_PATH, model)
    },
    options: {
      validate: {
        params: resumeParamsSchema
      }
    }
  }),
  /**
   * @satisfies {ServerRoute<{ Params: { slug: string } }>}
   */
  ({
    method: 'GET',
    path: '/resume-form-error/{slug?}',
    handler(request, h) {
      const { params } = request
      const { slug } = params
      const model = resumeErrorViewModel({ slug })

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
   * @satisfies {ServerRoute<{ Payload: SaveAndExitResumePasswordPayload, Params: SaveAndExitResumePasswordParams }>}
   */
  ({
    method: 'POST',
    path: '/resume-form-verify/{formId}/{magicLinkId}/{slug}/{state?}',
    async handler(request, h) {
      const { params, payload } = request
      const { formId, magicLinkId } = params
      const { securityAnswer } = payload

      // Validate the security answer
      const validatedLink = await validateSaveAndExitCredentials(
        magicLinkId,
        securityAnswer
      )

      // Reload form title in case it has changed
      const form = await getFormMetadataById(formId)

      if (validatedLink.validPassword) {
        // Restore state
        const cacheService = getCacheService(request.server)
        await cacheService.setState(request, validatedLink.state)

        const { isPreview, status } = validatedLink.form

        const slugAndState = isPreview ? `/${status}` : ''

        return h.redirect(`/resume-form-success/${form.slug}${slugAndState}`)
      }

      const attemptsRemaining = getPasswordAttemptsLeft(
        validatedLink.invalidPasswordAttempts
      )
      if (attemptsRemaining > 0) {
        // User has more password attempts left
        logger.info(
          `Invalid password attempt for form id ${validatedLink.form.id}`
        )
        const error = createInvalidPasswordError(attemptsRemaining)

        const model = passwordViewModel(
          form.title,
          validatedLink.question,
          attemptsRemaining,
          undefined,
          error
        )

        return h.view(RESUME_PASSWORD_PATH, model)
      } else {
        // Locked out
        const model = lockedOutViewModel(
          form,
          validatedLink,
          maxInvalidPasswordAttempts
        )
        return h.view(RESUME_ERROR_LOCKED, model)
      }
    },
    options: {
      validate: {
        params: resumeParamsSchema,
        payload: validatePayloadSchema,
        failAction: async (request, h, error) => {
          const params = /** @type {SaveAndExitResumePasswordParams} */ (
            request.params
          )
          const payload = /** @type {SaveAndExitResumePasswordPayload} */ (
            request.payload
          )
          const resumeDetails = await getSaveAndExitDetails(params.magicLinkId)

          if (!resumeDetails) {
            return h.redirect(ERROR_BASE_URL).takeover()
          }

          const form = await getFormMetadataById(resumeDetails.form.id)

          const model = passwordViewModel(
            form.title,
            resumeDetails.question,
            getPasswordAttemptsLeft(resumeDetails.invalidPasswordAttempts),
            payload,
            error
          )

          return h.view(RESUME_PASSWORD_PATH, model).takeover()
        }
      }
    }
  }),
  /**
   * @satisfies {ServerRoute<{ Params: { slug: string, state?: string} }>}
   */
  ({
    method: 'GET',
    path: '/resume-form-success/{slug}/{state?}',
    async handler(request, h) {
      const { params } = request
      const { slug, state } = params
      const form = await getFormMetadata(slug)
      const model = resumeSuccessViewModel(form, state)

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
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { SaveAndExitParams, SaveAndExitPayload, SaveAndExitResumePasswordPayload, SaveAndExitResumePasswordParams } from '~/src/server/models/save-and-exit.js'
 */
