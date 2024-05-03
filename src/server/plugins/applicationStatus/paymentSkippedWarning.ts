import { type Request, type ResponseToolkit } from '@hapi/hapi'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'

export async function paymentSkippedWarning(
  request: Request,
  h: ResponseToolkit
) {
  const form: FormModel = request.server.app.forms[request.params.id]
  const { allowSubmissionWithoutPayment } = form.feeOptions

  if (allowSubmissionWithoutPayment) {
    const { customText } = form.specialPages?.paymentSkippedWarningPage ?? {}
    return h
      .view('payment-skip-warning', {
        customText,
        backLink: './../summary'
      })
      .takeover()
  }

  return h.redirect(`${request.params.id}/status`)
}

export async function continueToPayAfterPaymentSkippedWarning(
  request: Request,
  h: ResponseToolkit
) {
  const { cacheService } = request.services([])
  const state = await cacheService.getState(request)

  const payState = state.pay
  payState.meta++
  await cacheService.mergeState(request, payState)

  const payRedirectUrl = payState.next_url
  return h.redirect(payRedirectUrl)
}
