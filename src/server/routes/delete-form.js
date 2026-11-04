import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import { CITIZEN_AUTH_ROUTE_OPTIONS } from '~/src/server/auth/route-options.js'
import { FormRowStatus } from '~/src/server/constants.js'
import { getValidationErrorsFromSession } from '~/src/server/helpers/error-helper.js'
import { constructHomepageLink } from '~/src/server/helpers/route-helpers.js'
import { sessionNames } from '~/src/server/helpers/session-names.js'
import { t } from '~/src/server/i18n/index.js'
import { getFormStatus } from '~/src/server/routes/save-and-exit-helper.js'
import { getFormTranslator } from '~/src/server/routes/save-and-exit.js'
import { getFormMetadataById } from '~/src/server/services/formsService.js'
import {
  deleteSavedFormState,
  getSavedFormState
} from '~/src/server/services/submissionService.js'
import { getAllLanguages, resolveLanguage } from '~/src/server/utils/utils.js'

export const CONFIRM_DELETE_NAME = 'confirmDelete'

/**
 * Buld the Yes/No radio confirmation question
 * @param {FormMetadata} form
 * @param {string} pageHeading
 * @param {string} referenceNumber
 * @param {ErrorDetails | undefined} formErrors
 * @param {string} language
 * @returns {GovukField & { errorMessage: { text: string } | undefined }}
 */
function buildRadiosQuestion(
  form,
  pageHeading,
  referenceNumber,
  formErrors,
  language
) {
  return {
    name: CONFIRM_DELETE_NAME,
    fieldset: {
      legend: {
        text: pageHeading,
        isPageHeading: true,
        classes: 'govuk-fieldset__legend--l'
      }
    },
    hint: {
      text: t('deleteForm.hint', language, {
        formTitle: form.title,
        referenceNumber
      })
    },
    items: [
      {
        value: 'true',
        text: t('deleteForm.items.yes', language)
      },
      {
        value: 'false',
        text: t('deleteForm.items.no', language)
      }
    ],
    errorMessage: formErrors?.[CONFIRM_DELETE_NAME]
      ? { text: formErrors[CONFIRM_DELETE_NAME].text }
      : undefined
  }
}

export default [
  /**
   * @satisfies {ServerRoute<{ Params: DeleteFormParams }>}
   */
  ({
    method: 'GET',
    path: '/delete-form/{formId}/{magicLinkId}',
    handler: async (request, h) => {
      const { auth, params, yar } = request
      const { formId, magicLinkId } = params
      const { accessToken } = auth.credentials

      const form = await getFormMetadataById(formId)
      const savedForm = await getSavedFormState(accessToken, magicLinkId)
      const status = getFormStatus(savedForm)

      if (status !== FormRowStatus.InProgress) {
        throw Boom.badRequest(
          `Cannot delete form '${savedForm.referenceNumber}' because it is not in progress`
        )
      }

      const previewStatus = savedForm.form.isPreview
        ? savedForm.form.status
        : undefined
      const { translator, language } = await getFormTranslator(
        request,
        form,
        previewStatus,
        true
      )

      const referenceNumber = savedForm.referenceNumber
      const backLink = {
        href: constructHomepageLink(
          form.slug,
          savedForm.form.isPreview ? savedForm.form.status : undefined
        )
      }

      // Validation errors
      const validation = getValidationErrorsFromSession(
        yar,
        sessionNames.validationFailure.deleteSavedForm
      )
      const { formErrors } = validation ?? {}
      const pageHeading = t('deleteForm.title', language)

      // Translate any error messages
      if (formErrors) {
        Object.values(formErrors).forEach((value) => {
          value.text = t(value.text, language)
        })
      }

      const pageTitle = formErrors
        ? `${t('errors.titlePrefix', language)} ${pageHeading}`
        : pageHeading

      const radiosQuestion = buildRadiosQuestion(
        form,
        pageHeading,
        referenceNumber,
        formErrors,
        language
      )

      const errorSummary = formErrors && {
        titleText: t('errorPreview.errorSummaryHeading', language),
        errorList: Object.values(formErrors)
      }

      return h.view('delete-form', {
        pageTitle,
        backLink,
        errorSummary,
        radiosQuestion,
        context: {
          translator: {
            // Force page to show language selector irrespective of form capability
            ...translator,
            languages: getAllLanguages()
          }
        }
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
      const homePageHref = constructHomepageLink(
        form.slug,
        savedForm.form.isPreview ? savedForm.form.status : undefined
      )

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
          const { params } = request
          const { formId, magicLinkId } = params

          if (Joi.isError(err)) {
            const firstError = err.details.at(0)

            if (firstError?.path.at(0) === CONFIRM_DELETE_NAME) {
              request.yar.flash(
                sessionNames.validationFailure.deleteSavedForm,
                {
                  formErrors: {
                    [CONFIRM_DELETE_NAME]: {
                      text: 'deleteForm.confirmDeleteValidationMessage',
                      href: `#${CONFIRM_DELETE_NAME}`
                    }
                  },
                  formValues: request.payload
                }
              )
            }
          }

          return h
            .redirect(`/delete-form/${formId}/${magicLinkId}`)
            .code(StatusCodes.SEE_OTHER)
            .takeover()
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
 * @import { FormMetadata, GovukField } from '@defra/forms-model'
 * @import { ErrorDetails } from '~/src/server/types.js'
 */
