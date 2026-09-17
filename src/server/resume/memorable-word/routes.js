import { isOfflineBoom } from '@defra/forms-engine-plugin'

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { RESUME_ERROR_PATH } from '~/src/server/constants.js'
import {
  createInvalidPasswordError,
  lockedOutViewModel,
  passwordViewModel,
  resumeParamsSchema,
  validatePayloadSchema
} from '~/src/server/models/save-and-exit.js'
import { restoreState } from '~/src/server/resume/outcomes.js'
import {
  getFormTranslator,
  getPasswordAttemptsLeft,
  maxInvalidPasswordAttempts
} from '~/src/server/routes/save-and-exit.js'
import { getFormMetadataById } from '~/src/server/services/formMetadataGuards.js'
import {
  getSaveAndExitDetails,
  validateSaveAndExitCredentials
} from '~/src/server/services/submissionService.js'

const RESUME_ERROR_LOCKED = 'save-and-exit/resume-error-locked'
const RESUME_PASSWORD_PATH = 'save-and-exit/resume-password'

export default [
  /**
   * @satisfies {ServerRoute<{ Params: SaveAndExitResumePasswordParams }>}
   */
  ({
    method: 'GET',
    path: '/resume-form-verify/{formId}/{magicLinkId}/{slug}/{state?}',
    async handler(request, h) {
      const { params } = request
      const { formId, magicLinkId, state: status } = params

      // Assert the form is online BEFORE looking up save-and-exit details so
      // we don't leak magic-link validity timing for offline forms.
      let form
      try {
        form = await getFormMetadataById(formId, status)
      } catch (err) {
        if (isOfflineBoom(err)) {
          throw err
        }
        logger.error(
          err,
          `Invalid formId ${formId} in magic link id ${magicLinkId}`
        )
        return h.redirect(RESUME_ERROR_PATH)
      }

      const resumeDetails = await getSaveAndExitDetails(magicLinkId)

      if (!resumeDetails) {
        return h.redirect(RESUME_ERROR_PATH)
      }

      const { translator } = await getFormTranslator(request, form, status)

      const model = passwordViewModel(
        form,
        resumeDetails.question,
        getPasswordAttemptsLeft(resumeDetails.invalidPasswordAttempts),
        translator,
        undefined,
        undefined
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
   * @satisfies {ServerRoute<{ Payload: SaveAndExitResumePasswordPayload, Params: SaveAndExitResumePasswordParams }>}
   */
  ({
    method: 'POST',
    path: '/resume-form-verify/{formId}/{magicLinkId}/{slug}/{state?}',
    async handler(request, h) {
      const { params, payload } = request
      const { formId, magicLinkId, state } = params
      const { securityAnswer } = payload

      let form
      try {
        form = await getFormMetadataById(formId, state)
      } catch (err) {
        if (isOfflineBoom(err)) {
          throw err
        }
        logger.error(
          err,
          `Invalid formId ${formId} in magic link id ${magicLinkId}`
        )
        return h.redirect(RESUME_ERROR_PATH)
      }

      const validatedLink = await validateSaveAndExitCredentials(
        magicLinkId,
        securityAnswer
      )

      if (validatedLink.validPassword) {
        const { isPreview, status } = validatedLink.form

        /** @type {ResumeContext} */
        const context = {
          form,
          details: validatedLink,
          formId,
          magicLinkId,
          slugAndState: isPreview ? `/${status}` : ''
        }

        // restoreState takes the plain hapi Request and ResponseToolkit, so
        // it works the same whichever route calls it. A valid password
        // always comes with the saved state and group id, so the type here
        // states that rather than repeating the optional API type.
        return restoreState(
          /** @type {Request} */ (/** @type {unknown} */ (request)),
          /** @type {ResponseToolkit} */ (/** @type {unknown} */ (h)),
          /** @type {{ state: object, magicLinkGroupId: string }} */ ({
            state: validatedLink.state,
            magicLinkGroupId: validatedLink.magicLinkGroupId
          }),
          context
        )
      }

      const attemptsRemaining = getPasswordAttemptsLeft(
        validatedLink.invalidPasswordAttempts
      )

      const { translator } = await getFormTranslator(request, form, state)

      if (attemptsRemaining > 0) {
        // User has more password attempts left
        logger.info(
          `Invalid password attempt for form id ${validatedLink.form.id}`
        )
        const error = createInvalidPasswordError(attemptsRemaining, translator)

        const model = passwordViewModel(
          form,
          validatedLink.question,
          attemptsRemaining,
          translator,
          payload,
          error
        )

        return h.view(RESUME_PASSWORD_PATH, model)
      } else {
        // Locked out
        const model = lockedOutViewModel(
          form,
          validatedLink,
          maxInvalidPasswordAttempts,
          translator
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
            return h.redirect(RESUME_ERROR_PATH).takeover()
          }

          const form = await getFormMetadataById(
            resumeDetails.form.id,
            params.state
          )
          const { translator } = await getFormTranslator(
            request,
            form,
            params.state
          )

          const model = passwordViewModel(
            form,
            resumeDetails.question,
            getPasswordAttemptsLeft(resumeDetails.invalidPasswordAttempts),
            translator,
            payload,
            error
          )

          return h.view(RESUME_PASSWORD_PATH, model).takeover()
        }
      }
    }
  })
]

/**
 * @import { ServerRoute, Request, ResponseToolkit } from '@hapi/hapi'
 * @import { SaveAndExitResumePasswordParams, SaveAndExitResumePasswordPayload } from '~/src/server/models/save-and-exit.js'
 * @import { ResumeContext } from '~/src/server/resume/types.js'
 */
