import { token } from '@hapi/jwt'

import config from '~/src/server/config.js'
import { postJson } from '~/src/server/services/httpService.js'

const notifyAPIKey = config.notifyAPIKey as string

const apiKeyId: string = notifyAPIKey.substring(
  notifyAPIKey.length - 36,
  notifyAPIKey.length
)
const serviceId: string = notifyAPIKey.substring(
  notifyAPIKey.length - 73,
  notifyAPIKey.length - 37
)

type Personalisation = Record<string, any>

export interface SendNotificationArgs {
  templateId: string
  emailAddress: string
  personalisation: Personalisation
}

function createToken(iss: string, secret: string) {
  const iat = Math.round(Date.now() / 1000)

  return token.generate({ iss, iat }, secret, {
    header: { typ: 'JWT', alg: 'HS256' }
  })
}

export async function sendNotification(args: SendNotificationArgs) {
  const { templateId, emailAddress, personalisation } = args

  return postJson(
    `https://api.notifications.service.gov.uk/v2/notifications/email`,
    {
      payload: {
        template_id: templateId,
        email_address: emailAddress,
        personalisation
      },
      headers: {
        Authorization: 'Bearer ' + createToken(serviceId, apiKeyId)
      }
    }
  )
}
