import Boom from '@hapi/boom'
import Joi from 'joi'

import { HOMEPAGE_PREFIX, PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  buildErrorList,
  createMessageTranslator,
  getValidationErrorsFromSession
} from '~/src/server/helpers/error-helper.js'
import { redirectWithErrors } from '~/src/server/helpers/redirect-helper.js'
import { sessionNames } from '~/src/server/helpers/session-names.js'
import { t } from '~/src/server/i18n/index.js'
import { CITIZEN_AUTH_ROUTE_OPTIONS } from '~/src/server/routes/auth.js'
import {
  SavedFormStatus,
  getFormStatus
} from '~/src/server/routes/save-and-exit-helper.js'
import { getFormMetadataById } from '~/src/server/services/formsService.js'
import {
  deleteSavedFormState,
  getSavedFormState
} from '~/src/server/services/submissionService.js'
import { resolveLanguage } from '~/src/server/utils/utils.js'

export const CONFIRM_DELETE_NAME = 'confirmDelete'
export const messageTranslations = {
  [CONFIRM_DELETE_NAME]: {
    '*': 'deleteForm.confirmDeleteValidationMessage'
  }
}

/**
 * Get the homepage href
 * @param {FormMetadata} form
 * @param {SavedFormState} savedForm
 * @returns {string}
 */
function getHomepageHref(form, savedForm) {
  const { slug } = form
  const { isPreview, status: state } = savedForm.form

  return isPreview
    ? `${HOMEPAGE_PREFIX}${PREVIEW_PATH_PREFIX}/${state}/${slug}`
    : `${HOMEPAGE_PREFIX}/${slug}`
}

export default [
  /**
   * @satisfies {ServerRoute<{ Params: DeleteFormParams }>}
   */
  ({
    method: 'GET',
    path: '/delete-form/{formId}/{magicLinkId}',
    handler: async (request, h) => {
      const { auth, query, params, yar } = request
      const { formId, magicLinkId } = params
      const { accessToken } = auth.credentials

      const lang = resolveLanguage(query, yar)
      const form = await getFormMetadataById(formId)
      const savedForm = await getSavedFormState(accessToken, magicLinkId)
      const status = getFormStatus(savedForm)

      if (status !== SavedFormStatus.InProgress) {
        throw Boom.badRequest(
          `Cannot delete form '${savedForm.referenceNumber}' because it is not in progress`
        )
      }

      const referenceNumber = savedForm.referenceNumber
      const backLink = { href: getHomepageHref(form, savedForm) }

      // Validation errors
      const validation = getValidationErrorsFromSession(
        yar,
        sessionNames.validationFailure.deleteSavedForm
      )
      const { formErrors } = validation ?? {}
      const pageHeading = t('deleteForm.title', lang)
      const pageTitle = formErrors
        ? `${t('errors.titlePrefix', lang)} ${pageHeading}`
        : pageHeading

      const radiosQuestion = {
        name: CONFIRM_DELETE_NAME,
        fieldset: {
          legend: {
            text: pageHeading,
            isPageHeading: true,
            classes: 'govuk-fieldset__legend--l'
          }
        },
        hint: {
          text: t('deleteForm.hint', lang, {
            formTitle: form.title,
            referenceNumber
          })
        },
        items: [
          {
            value: 'true',
            text: t('deleteForm.items.yes', lang)
          },
          {
            value: 'false',
            text: t('deleteForm.items.no', lang)
          }
        ],
        errorMessage: formErrors?.[CONFIRM_DELETE_NAME]
          ? { text: formErrors[CONFIRM_DELETE_NAME].text }
          : undefined
      }

      const errorSummary = formErrors && {
        titleText: t('errorPreview.errorSummaryHeading', lang),
        errorList: buildErrorList(formErrors, [CONFIRM_DELETE_NAME])
      }

      return h.view('delete-form', {
        pageTitle,
        backLink,
        errorSummary,
        radiosQuestion
      })
    },
    options: {
      auth: CITIZEN_AUTH_ROUTE_OPTIONS,
      validate: {
        params: Joi.object({
          formId: Joi.string().required(),
          magicLinkId: Joi.string().uuid().required()
        }).required()
      }
    }
  }),

  /**
   * @satisfies {ServerRoute<{ Params: DeleteFormParams, Payload: { confirmDelete: boolean } }>}
   */
  ({
    method: 'POST',
    path: '/delete-form/{formId}/{magicLinkId}',
    handler: async (request, h) => {
      const { auth, query, params, payload, yar } = request
      const { formId, magicLinkId } = params
      const { accessToken } = auth.credentials

      const form = await getFormMetadataById(formId)
      const savedForm = await getSavedFormState(accessToken, magicLinkId)
      const homePageHref = getHomepageHref(form, savedForm)

      if (payload.confirmDelete) {
        await deleteSavedFormState(accessToken, magicLinkId)

        const lang = resolveLanguage(query, yar)

        yar.flash(
          sessionNames.successNotification,
          t('deleteForm.successNotification', lang)
        )
      }

      return h.redirect(homePageHref)
    },
    options: {
      auth: CITIZEN_AUTH_ROUTE_OPTIONS,
      validate: {
        failAction(request, h, err) {
          const lang = resolveLanguage(request.query)
          const messageTranslator = createMessageTranslator(
            messageTranslations,
            lang
          )

          return redirectWithErrors(
            request,
            h,
            err,
            sessionNames.validationFailure.deleteSavedForm,
            messageTranslator
          )
        },
        params: Joi.object({
          formId: Joi.string().required(),
          magicLinkId: Joi.string().uuid().required()
        }).required(),
        payload: Joi.object()
          .keys({
            [CONFIRM_DELETE_NAME]: Joi.boolean().required()
          })
          .required()
      }
    }
  })
]

/**
 * @typedef {{ formId: string, magicLinkId: string }} DeleteFormParams
 */

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { SavedFormState } from '~/src/server/services/submissionService.js'
 */
