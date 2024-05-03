import {
  type Output,
  type WebhookOutputConfiguration
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type Request, type Server } from '@hapi/hapi'
import nunjucks from 'nunjucks'

import config from '~/src/server/config.js'
import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type NotifyModel } from '~/src/server/plugins/engine/models/submission/index.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'
import {
  type CacheService,
  type NotifyService,
  type PayService,
  type WebhookService
} from '~/src/server/services/index.js'
import { type SendNotificationArgs } from '~/src/server/services/notifyService.js'

type WebhookModel = WebhookOutputConfiguration & {
  formData: object
}

interface OutputArgs {
  notify: SendNotificationArgs[]
  webhook: WebhookModel[]
}

type OutputModel = Output & {
  outputData: NotifyModel | WebhookModel
}

function isWebhookModel(
  output?: OutputModel['outputData']
): output is WebhookModel {
  return !!(output && 'url' in output)
}

function isNotifyModel(
  output?: OutputModel['outputData']
): output is NotifyModel {
  return !!(output && 'emailAddress' in output)
}

export class StatusService {
  /**
   * StatusService handles sending data at the end of the form to the configured `Outputs`
   */
  logger: Server['logger']
  cacheService: CacheService
  webhookService: WebhookService
  notifyService: NotifyService
  payService: PayService

  constructor(server: Server) {
    this.logger = server.logger
    const { cacheService, webhookService, notifyService, payService } =
      server.services([])
    this.cacheService = cacheService
    this.webhookService = webhookService
    this.notifyService = notifyService
    this.payService = payService
  }

  async shouldShowPayErrorPage(request: Request): Promise<boolean> {
    const { pay } = await this.cacheService.getState(request)
    if (!pay) {
      this.logger.info(
        ['StatusService', 'shouldShowPayErrorPage'],
        'No pay state detected, skipping'
      )
      return false
    }
    const { self, meta } = pay
    const { query } = request
    const { state } = await this.payService.payStatus(self, meta.payApiKey)
    pay.state = state

    if (state.status === 'success') {
      this.logger.info(
        ['StatusService', 'shouldShowPayErrorPage'],
        `user ${request.yar.id} - shouldShowPayErrorPage: User has succeeded, setting paymentSkipped to false and continuing`
      )

      pay.paymentSkipped = false
      pay.state = state
      await this.cacheService.mergeState(request, { pay })

      return false
    }

    const form: FormModel = request.server.app.forms[request.params.id]
    const { maxAttempts, allowSubmissionWithoutPayment } = form.feeOptions

    this.logger.info(
      ['StatusService', 'shouldShowPayErrorPage'],
      `user ${request.yar.id} - shouldShowPayErrorPage: User has failed ${meta.attempts} payments`
    )

    if (!allowSubmissionWithoutPayment) {
      return true
    }

    const userSkippedOrLimitReached =
      query?.continue === 'true' || meta?.attempts >= maxAttempts

    await this.cacheService.mergeState(request, {
      pay: {
        ...pay,
        paymentSkipped: userSkippedOrLimitReached
      }
    })

    const shouldRetry = state.status === 'failed' && !userSkippedOrLimitReached

    this.logger.info(
      ['StatusService', 'shouldShowPayErrorPage'],
      `user ${request.yar.id} - shouldShowPayErrorPage: ${shouldRetry}`
    )

    return shouldRetry
  }

  async outputRequests(request: Request) {
    const state = await this.cacheService.getState(request)
    const formData = this.webhookArgsFromState(state)

    const { outputs, callback } = state

    let newReference

    if (callback) {
      this.logger.info(
        ['StatusService', 'outputRequests'],
        `Callback detected for ${request.yar.id} - PUT to ${callback.callbackUrl}`
      )
      try {
        newReference = await this.webhookService.postRequest(
          callback.callbackUrl,
          formData,
          'PUT'
        )
      } catch (e) {
        throw Boom.badRequest(e)
      }
    }

    const firstWebhook = outputs?.find((output) => output.type === 'webhook')
    const otherOutputs = outputs?.filter((output) => output !== firstWebhook)
    if (firstWebhook) {
      newReference = await this.webhookService.postRequest(
        firstWebhook.outputData.url,
        formData
      )
      await this.cacheService.mergeState(request, {
        reference: newReference
      })
    }

    const { notify = [], webhook = [] } = this.outputArgs(
      otherOutputs,
      formData,
      newReference,
      state.pay
    )

    const requests = [
      ...notify.map((args) => this.notifyService.sendNotification(args)),
      ...webhook.map(({ url, formData }) =>
        this.webhookService.postRequest(url, formData)
      )
    ]

    return {
      reference: newReference,
      results: Promise.allSettled(requests)
    }
  }

  /**
   * Appends `{paymentSkipped: true}` to the `metadata` property and drops the `fees` property if the user has chosen to skip payment
   */
  webhookArgsFromState(state) {
    const { pay = {}, webhookData } = state
    const { paymentSkipped } = pay
    const { metadata, fees, ...rest } = webhookData
    return {
      ...rest,
      ...(!paymentSkipped && { fees }),
      metadata: {
        ...metadata,
        ...state.metadata,
        paymentSkipped: paymentSkipped ?? false
      }
    }
  }

  emailOutputsFromState(
    outputData,
    reference,
    payReference
  ): SendNotificationArgs {
    const {
      apiKey,
      templateId,
      emailAddress,
      personalisation = {},
      addReferencesToPersonalisation = false,
      emailReplyToId
    } = outputData

    return {
      personalisation: {
        ...personalisation,
        ...(addReferencesToPersonalisation && {
          hasWebhookReference: !!reference,
          webhookReference: reference || '',
          hasPaymentReference: !!payReference,
          paymentReference: payReference || ''
        })
      },
      reference,
      apiKey,
      templateId,
      emailAddress,
      emailReplyToId
    }
  }

  outputArgs(
    outputs: OutputModel[] = [],
    formData = {},
    reference,
    payReference
  ): OutputArgs {
    this.logger.trace(['StatusService', 'outputArgs'], JSON.stringify(outputs))
    return outputs.reduce<OutputArgs>(
      (previousValue: OutputArgs, currentValue: OutputModel) => {
        const { notify, webhook } = previousValue
        if (isNotifyModel(currentValue.outputData)) {
          const args = this.emailOutputsFromState(
            currentValue.outputData,
            reference,
            payReference
          )
          this.logger.trace(
            ['StatusService', 'outputArgs', 'notify'],
            JSON.stringify(args)
          )
          notify.push(args)
        }
        if (isWebhookModel(currentValue.outputData)) {
          const { url } = currentValue.outputData
          webhook.push({ url, formData })
          this.logger.trace(
            ['StatusService', 'outputArgs', 'webhookArgs'],
            JSON.stringify({ url, formData })
          )
        }

        return { notify, webhook }
      },
      {
        notify: [],
        webhook: []
      }
    )
  }

  getViewModel(
    state: FormSubmissionState,
    formModel: FormModel,
    newReference?: string
  ) {
    const { reference, pay, callback } = state
    this.logger.info(
      ['StatusService', 'getViewModel'],
      `generating viewModel for ${newReference ?? reference}`
    )
    const { customText, components } =
      formModel.def.specialPages?.confirmationPage ?? {}

    const referenceToDisplay =
      newReference === 'UNKNOWN' ? reference : newReference ?? reference

    const model = {
      reference: referenceToDisplay,
      ...(pay && { paymentSkipped: pay.paymentSkipped })
    }

    if (!customText && !callback?.customText) {
      return model
    }

    if (config.allowUserTemplates) {
      if (customText?.nextSteps) {
        customText.nextSteps = nunjucks.renderString(
          customText.nextSteps,
          state
        )
      }
      if (customText?.paymentSkipped) {
        customText.paymentSkipped = nunjucks.renderString(
          customText.paymentSkipped,
          state
        )
      }
    }

    model.customText = {
      ...customText,
      ...callback?.customText
    }

    const componentDefsToRender = callback?.components ?? components ?? []
    const componentCollection = new ComponentCollection(
      componentDefsToRender,
      formModel
    )
    model.components = componentCollection.getViewModel(
      state,
      undefined,
      formModel.conditions
    )

    return model
  }
}
