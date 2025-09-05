import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'
import { crumbSchema } from '@defra/forms-engine-plugin/schema.js'
import { FormStatus } from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  createInvalidPasswordError,
  saveAndExitLockedOutViewModel,
  saveAndExitPasswordViewModel,
  saveAndExitResumeErrorViewModel,
  saveAndExitResumeSuccessViewModel
} from '~/src/server/models/save-and-exit.js'
import {
  getFormMetadataById,
  getSaveAndExitDetails,
  validateSaveAndExitCredentials
} from '~/src/server/services/formsService.js'

const logger = createLogger()

const errorBaseUrl = '/save-and-exit-resume-error'

const maxInvalidPasswordAttempts = 3

const validateSaveAndExitSchema = Joi.object().keys({
  crumb: crumbSchema,
  securityAnswer: Joi.string().min(3).max(40).required().messages({
    'string.min': 'Your answer must be between 3 and 40 characters long',
    'string.max': 'Your answer must be between 3 and 40 characters long',
    '*': 'Enter an answer to the security question'
  })
})

export default [
  /** @type {ServerRoute} */
  ({
    method: 'GET',
    path: '/save-and-exit-resume/{formId}/{magicLinkId}',
    async handler(request, h) {
      const { params } = request

      // Check form id
      let form
      try {
        form = await getFormMetadataById(params.formId)
      } catch (err) {
        logger.error(
          `Invalid formId ${params.formId} in magic link id ${params.magicLinkId}`,
          err
        )
        return h.redirect(errorBaseUrl).code(StatusCodes.SEE_OTHER).takeover()
      }

      // Check magic link id
      let linkDetails
      try {
        linkDetails = await getSaveAndExitDetails(params.magicLinkId)
      } catch (err) {
        logger.error(
          `Invalid magic link id ${params.magicLinkId} with form id ${params.formId}`,
          err
        )
        return h
          .redirect(`${errorBaseUrl}/${form.slug}`)
          .code(StatusCodes.SEE_OTHER)
          .takeover()
      }

      return h.redirect(
        `/save-and-exit-resume-verify/${params.formId}/${params.magicLinkId}/${linkDetails?.form.status}/${form.slug}`
      )
    }
  }),

  /** @type {ServerRoute} */
  ({
    method: 'GET',
    path: '/save-and-exit-resume-verify/{formId}/{magicLinkId}/{state}/{slug}',
    async handler(request, h) {
      const { params } = request
      const resumeDetails = await getSaveAndExitDetails(params.magicLinkId)
      if (!resumeDetails) {
        return h.redirect(errorBaseUrl)
      }

      // Check form id
      let form
      try {
        form = await getFormMetadataById(resumeDetails.form.id)
      } catch (err) {
        logger.error(
          `Invalid formId ${params.formId} in magic link id ${params.magicLinkId}`,
          err
        )
        return h.redirect(errorBaseUrl).takeover()
      }

      const payload = /** @type {SaveAndExitResumePasswordPayload} */ ({
        magicLinkId: params.magicLinkId,
        securityQuestion: resumeDetails.question,
        securityAnswer: '',
        slug: form.slug
      })

      const model = saveAndExitPasswordViewModel(payload, form.title)

      return h.view('save-and-exit/resume-password', model)
    }
  }),

  /** @type {ServerRoute} */
  ({
    method: 'GET',
    path: '/save-and-exit-resume-error/{slug?}',
    handler(request, h) {
      const { params } = request
      const model = saveAndExitResumeErrorViewModel({ slug: params.slug })
      return h.view('save-and-exit/resume-error', model)
    }
  }),

  /**
   * @satisfies {ServerRoute<{ Payload: { securityAnswer: string, securityQuestion: string }, Params: { formId: string, magicLinkId: string } }>}
   */
  ({
    method: 'POST',
    path: '/save-and-exit-resume-verify/{formId}/{magicLinkId}/{state}/{slug}',
    async handler(request, h) {
      const payload = /** @type {SaveAndExitResumePasswordPayload} */ (
        request.payload
      )
      const { params } = request
      const { magicLinkId } = /** @type {{ magicLinkId: string}} */ (params)

      const validatedLink = /** @type {SaveAndExitResumeDetails} */ (
        await validateSaveAndExitCredentials(
          magicLinkId,
          payload.securityAnswer
        )
      )

      // Reload form title in case it has changed
      const form = await getFormMetadataById(
        /** @type {string} */ (params.formId)
      )

      if (validatedLink.result === 'Success') {
        // Restore state
        const cacheService = getCacheService(request.server)
        await cacheService.setState(request, validatedLink.state)

        return h
          .redirect(
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            `/save-and-exit-resume-success/${validatedLink.form.status ?? FormStatus.Live}/${form.slug}/${params.formId}`
          )
          .takeover()
      }

      if (validatedLink.result === 'Invalid security answer') {
        const attemptsRemaining =
          maxInvalidPasswordAttempts - validatedLink.invalidPasswordAttempts
        if (attemptsRemaining > 0) {
          // User has more password attempts left
          logger.info(
            `Invalid password attempt for form id ${validatedLink.form.id}`
          )
          const error = createInvalidPasswordError(attemptsRemaining)

          payload.securityQuestion = /** @type {SecurityQuestionsEnum} */ (
            validatedLink.securityQuestion
          )

          const model = saveAndExitPasswordViewModel(payload, form.title, error)

          return h.view('save-and-exit/resume-password', model).takeover()
        } else {
          // Locked out
          const model = saveAndExitLockedOutViewModel(form, validatedLink)
          return h.view('save-and-exit/resume-error-locked', model).takeover()
        }
      }
    },
    options: {
      validate: {
        payload: validateSaveAndExitSchema,
        failAction: async (request, h, error) => {
          const { payload, params } =
            /** @type {{ payload: SaveAndExitResumePasswordPayload, params: any }} */ (
              request
            )
          const resumeDetails = await getSaveAndExitDetails(params.magicLinkId)
          const form = await getFormMetadataById(
            /** @type {string} */ (resumeDetails?.form.id)
          )
          payload.securityQuestion = /** @type {SecurityQuestionsEnum} */ (
            resumeDetails?.question
          )
          const model = saveAndExitPasswordViewModel(
            /** @type {SaveAndExitResumePasswordPayload} */ (payload),
            form.title,
            error
          )

          return h.view('save-and-exit/resume-password', model).takeover()
        }
      }
    }
  }),

  /** @type {ServerRoute} */
  ({
    method: 'GET',
    path: '/save-and-exit-resume-success/{state}/{slug}/{formId}',
    async handler(request, h) {
      const { params } = request

      const form = await getFormMetadataById(params.formId)
      const model = saveAndExitResumeSuccessViewModel(form, params.state)
      return h.view('save-and-exit/resume-success', model)
    }
  })
]

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { SecurityQuestionsEnum } from '@defra/forms-model'
 * @import { SaveAndExitResumeDetails } from '~/src/server/types.js'
 * @import { SaveAndExitResumePasswordPayload } from '~/src/server/models/save-and-exit.js'
 */
