import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'
import { crumbSchema, stateSchema } from '@defra/forms-engine-plugin/schema.js'
import { slugSchema } from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  createInvalidPasswordError,
  saveAndExitLockedOutViewModel,
  saveAndExitPasswordViewModel,
  saveAndExitResumeErrorViewModel,
  saveAndExitResumeSuccessViewModel,
  securityAnswerSchema
} from '~/src/server/models/save-and-exit.js'
import {
  getFormMetadata,
  getFormMetadataById,
  getSaveAndExitDetails,
  validateSaveAndExitCredentials
} from '~/src/server/services/formsService.js'

const logger = createLogger()

const maxInvalidPasswordAttempts = 3

const validateSaveAndExitSchema = Joi.object().keys({
  crumb: crumbSchema,
  securityAnswer: securityAnswerSchema
})

const saveAndExitParamsSchema = Joi.object()
  .keys({
    formId: Joi.string().required(),
    magicLinkId: Joi.string().uuid().required(),
    slug: slugSchema,
    state: stateSchema.optional()
  })
  .required()

// View paths
const ERROR_BASE_URL = '/save-and-exit-resume-error'
const RESUME_ERROR = 'save-and-exit/resume-error'
const RESUME_ERROR_LOCKED = 'save-and-exit/resume-error-locked'
const RESUME_PASSWORD_PATH = 'save-and-exit/resume-password'
const RESUME_SUCCESS = 'save-and-exit/resume-success'

export default [
  /**
   * @satisfies {ServerRoute<{ Params: { formId: string, magicLinkId: string } }>}
   */
  ({
    method: 'GET',
    path: '/save-and-exit-resume/{formId}/{magicLinkId}',
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
        return h
          .redirect(`${ERROR_BASE_URL}/${form.slug}`)
          .code(StatusCodes.SEE_OTHER)
      }

      const { isPreview, status } = linkDetails.form

      const slugAndState = isPreview ? `/${status}` : ''

      return h.redirect(
        `/save-and-exit-resume-verify/${formId}/${magicLinkId}/${form.slug}${slugAndState}`
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
   * @satisfies {ServerRoute<{ Params: { formId: string, magicLinkId: string, slug: string, state?: string } }>}
   */
  ({
    method: 'GET',
    path: '/save-and-exit-resume-verify/{formId}/{magicLinkId}/{slug}/{state?}',
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

      const model = saveAndExitPasswordViewModel(
        form.title,
        resumeDetails.question
      )

      return h.view(RESUME_PASSWORD_PATH, model)
    },
    options: {
      validate: {
        params: saveAndExitParamsSchema
      }
    }
  }),
  /**
   * @satisfies {ServerRoute<{ Params: { slug: string } }>}
   */
  ({
    method: 'GET',
    path: '/save-and-exit-resume-error/{slug?}',
    handler(request, h) {
      const { params } = request
      const { slug } = params
      const model = saveAndExitResumeErrorViewModel({ slug })

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
    path: '/save-and-exit-resume-verify/{formId}/{magicLinkId}/{slug}/{state?}',
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

        return h.redirect(
          `/save-and-exit-resume-success/${form.slug}${slugAndState}`
        )
      }

      const attemptsRemaining =
        maxInvalidPasswordAttempts - validatedLink.invalidPasswordAttempts
      if (attemptsRemaining > 0) {
        // User has more password attempts left
        logger.info(
          `Invalid password attempt for form id ${validatedLink.form.id}`
        )
        const error = createInvalidPasswordError(attemptsRemaining)

        const model = saveAndExitPasswordViewModel(
          form.title,
          validatedLink.question,
          undefined,
          error
        )

        return h.view(RESUME_PASSWORD_PATH, model)
      } else {
        // Locked out
        const model = saveAndExitLockedOutViewModel(form, validatedLink)
        return h.view(RESUME_ERROR_LOCKED, model)
      }
    },
    options: {
      validate: {
        params: saveAndExitParamsSchema,
        payload: validateSaveAndExitSchema,
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

          const model = saveAndExitPasswordViewModel(
            form.title,
            resumeDetails.question,
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
    path: '/save-and-exit-resume-success/{slug}/{state?}',
    async handler(request, h) {
      const { params } = request
      const { slug, state } = params
      const form = await getFormMetadata(slug)
      const model = saveAndExitResumeSuccessViewModel(form, state)

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
 * @import { FormStatus } from '@defra/forms-model'
 * @import { SaveAndExitResumePasswordPayload, SaveAndExitResumePasswordParams } from '~/src/server/models/save-and-exit.js'
 */
