import { isMultipleApiKey, type MultipleApiKeys } from '@defra/forms-model'
import { type Server } from '@hapi/hapi'
import { NotifyClient } from 'notifications-node-client/client/notification.js'

import config from '~/src/server/config.js'

type Personalisation = Record<string, any>

interface SendEmailOptions {
  personalisation: Personalisation
  reference: string
  emailReplyToId?: string
}

export interface SendNotificationArgs {
  apiKey: string | MultipleApiKeys
  templateId: string
  emailAddress: string
  personalisation: Personalisation
  reference: string
  emailReplyToId?: string
}

export class NotifyService {
  /**
   * This service is responsible for sending emails via {@link https://www.notifications.service.gov.uk }. This service has been registered by {@link createServer}
   */
  logger: Server['logger']
  constructor(server: Server) {
    this.logger = server.logger
  }

  parsePersonalisations(options: Personalisation): Personalisation {
    const entriesWithReplacedBools = Object.entries(options).map(
      ([key, value]) => {
        if (typeof value === 'boolean') {
          return [key, value ? 'yes' : 'no']
        }
        return [key, value]
      }
    )

    return Object.fromEntries(entriesWithReplacedBools)
  }

  sendNotification(args: SendNotificationArgs) {
    const {
      templateId,
      emailAddress,
      personalisation,
      reference,
      emailReplyToId
    } = args
    let { apiKey } = args

    if (isMultipleApiKey(apiKey)) {
      apiKey = (
        config.apiEnv === 'production'
          ? apiKey.production ?? apiKey.test
          : apiKey.test ?? apiKey.production
      )!
    }

    const parsedOptions: SendEmailOptions = {
      personalisation: this.parsePersonalisations(personalisation),
      reference,
      emailReplyToId
    }

    const notifyClient: any = new NotifyClient(apiKey)

    notifyClient
      .sendEmail(templateId, emailAddress, parsedOptions)
      .then(() =>
        this.logger.info(
          ['NotifyService', 'sendNotification'],
          'Email sent successfully'
        )
      )
      .catch((error) =>
        this.logger.error(
          ['NotifyService', 'sendNotification'],
          `Error processing output: ${error.message}`
        )
      )
  }
}
