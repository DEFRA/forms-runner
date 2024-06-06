// @ts-expect-error - Allow import without types
import { NotifyClient } from 'notifications-node-client'

import config from '~/src/server/config.js'

const { notifyAPIKey } = config

type Personalisation = Record<string, any>

interface SendEmailOptions {
  personalisation: Personalisation
  reference: string
  emailReplyToId?: string
}

export interface SendNotificationArgs {
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

export function sendNotification(args: SendNotificationArgs) {
  const {
    templateId,
    emailAddress,
    personalisation,
    reference,
    emailReplyToId
  } = args

  const parsedOptions: SendEmailOptions = {
    personalisation,
    reference,
    emailReplyToId
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const notifyClient = new NotifyClient(notifyAPIKey) as NotifyInterface

  return notifyClient.sendEmail(templateId, emailAddress, parsedOptions)
}
