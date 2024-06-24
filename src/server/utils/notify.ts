// @ts-expect-error - Allow import without types
import { NotifyClient } from 'notifications-node-client'
import { type Logger } from 'pino'

import config from '~/src/server/config.js'

const { notifyAPIKey, httpsProxyUrl, httpsProxyUsername, httpsProxyPassword } =
  config

type Personalisation = Record<string, any>

interface SendEmailOptions {
  personalisation: Personalisation
  reference: string
  emailReplyToId?: string
}

interface SetProxyOptions {
  host: string
  port: string
  auth?: {
    username: string
    password: string
  }
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
  setProxy: (options: SetProxyOptions) => void
}

export function sendNotification(args: SendNotificationArgs, logger: Logger) {
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

  // Set proxy options on the client if available
  if (httpsProxyUrl) {
    const proxyUrl = new URL(httpsProxyUrl as string)
    const host = proxyUrl.host
    const port = proxyUrl.port || '443'
    const proxyOptions: SetProxyOptions = { host, port }

    if (httpsProxyUsername && httpsProxyPassword) {
      proxyOptions.auth = {
        username: httpsProxyUsername as string,
        password: httpsProxyPassword as string
      }
    }

    const hasAuth = !!proxyOptions.auth

    logger.info(
      ['notify', 'proxy'],
      `Setting notify client proxy to '${httpsProxyUrl}'. Host: '${host}', Port: '${port}', Auth: '${hasAuth}'`
    )

    notifyClient.setProxy(proxyOptions)
  }

  return notifyClient.sendEmail(templateId, emailAddress, parsedOptions)
}
