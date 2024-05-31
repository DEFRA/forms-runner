import { type Request, type ResponseToolkit } from '@hapi/hapi'
import Joi from 'joi'

import { extractFormInfoFromPath } from '../engine/plugin.js'

import { checkUserCompletedSummary } from '~/src/server/plugins/applicationStatus/checkUserCompletedSummary.js'
import { handleUserWithConfirmationViewModel } from '~/src/server/plugins/applicationStatus/handleUserWithConfirmationViewModel.js'
import {
  continueToPayAfterPaymentSkippedWarning,
  paymentSkippedWarning
} from '~/src/server/plugins/applicationStatus/paymentSkippedWarning.js'
import { retryPay } from '~/src/server/plugins/applicationStatus/retryPay.js'
import { redirectTo } from '~/src/server/plugins/engine/index.js'

const preHandlers = {
  retryPay: {
    method: retryPay,
    assign: 'shouldShowPayErrorPage'
  },
  handleUserWithConfirmationViewModel: {
    method: handleUserWithConfirmationViewModel,
    assign: 'confirmationViewModel'
  },
  checkUserCompletedSummary: {
    method: checkUserCompletedSummary,
    assign: 'userCompletedSummary'
  }
}

async function getHandler(request: Request, h: ResponseToolkit) {
  const { statusService, cacheService } = request.services([])

  const { cacheKey } = await extractFormInfoFromPath(request)
  const { model } = request.server.app.models.get(cacheKey)

  const state = await cacheService.getState(request)

  const { reference: newReference } =
    await statusService.outputRequests(request)

  if (state.callback?.skipSummary?.redirectUrl) {
    const { redirectUrl } = state.callback.skipSummary
    request.logger.info(
      ['applicationStatus'],
      `Callback skipSummary detected, redirecting ${request.yar.id} to ${redirectUrl} and clearing state`
    )
    await cacheService.setConfirmationState(request, {
      redirectUrl
    })
    await cacheService.clearState(request)

    return h.redirect(redirectUrl)
  }

  const viewModel = statusService.getViewModel(state, model, newReference)

  await cacheService.setConfirmationState(request, {
    confirmation: viewModel
  })
  await cacheService.clearState(request)

  return h.view('confirmation', viewModel)
}

const index = {
  plugin: {
    name: 'applicationStatus',
    dependencies: '@hapi/vision',
    multiple: true,
    register: (server) => {
      server.route({
        method: 'get',
        path: '/{slug}/status',
        options: {
          pre: [
            preHandlers.handleUserWithConfirmationViewModel,
            preHandlers.checkUserCompletedSummary
          ],
          handler: getHandler
        }
      })

      server.route({
        method: 'get',
        path: '/preview/{state}/{slug}/status',
        options: {
          pre: [
            preHandlers.handleUserWithConfirmationViewModel,
            preHandlers.checkUserCompletedSummary
          ],
          handler: getHandler
        }
      })

      server.route({
        method: 'post',
        path: '/{id}/status',
        handler: async (request: Request, h: ResponseToolkit) => {
          const { payService, cacheService } = request.services([])
          const { pay } = await cacheService.getState(request)
          const { meta } = pay
          meta.attempts++
          const res = await payService.retryPayRequest(pay)

          await cacheService.mergeState(request, {
            webhookData: {
              fees: {
                paymentReference: res.reference
              }
            },
            pay: {
              payId: res.payment_id,
              reference: res.reference,
              self: res._links.self.href,
              meta
            }
          })
          return redirectTo(request, h, res._links.next_url.href)
        }
      })

      server.route({
        method: 'get',
        path: '/{id}/status/payment-skip-warning',
        options: {
          pre: [preHandlers.checkUserCompletedSummary],
          handler: paymentSkippedWarning
        }
      })

      server.route({
        method: 'post',
        path: '/{id}/status/payment-skip-warning',
        options: {
          handler: continueToPayAfterPaymentSkippedWarning,
          validate: {
            payload: Joi.object({
              action: Joi.string().valid('pay').required(),
              crumb: Joi.string()
            })
          }
        }
      })
    }
  }
}

export default index
