import { isMultipleApiKey, type MultipleApiKeys } from '@defra/forms-model'
import { type Server } from '@hapi/hapi'
// @ts-expect-error - Allow import without types
import { NotifyClient } from 'notifications-node-client'

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

interface NotifyInterface {
  constructor: (apiKey: string) => void
  sendEmail: (
    templateId: string,
    emailAddress: string,
    personalisation: SendEmailOptions
  ) => Promise<void>
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const notifyClient = new NotifyClient(apiKey) as NotifyInterface

    notifyClient
      .sendEmail(templateId, emailAddress, parsedOptions)
      .then(() =>
        this.logger.info(
          ['NotifyService', 'sendNotification'],
          'Email sent successfully'
        )
      )
      .catch((error: unknown) =>
        this.logger.error(
          ['NotifyService', 'sendNotification'],
          error instanceof Error
            ? `Error processing output: ${error.message}`
            : 'Error processing output'
        )
      )
  }
}
