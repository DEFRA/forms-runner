import { token } from '@hapi/jwt'

import { config } from '~/src/config/index.js'
import { postJson } from '~/src/server/services/httpService.js'

const notifyAPIKey = config.get('notifyAPIKey')

// Extract the two uuids from the notifyApiKey
// See https://github.com/alphagov/notifications-node-client/blob/main/client/api_client.js#L17
// Needed until `https://github.com/alphagov/notifications-node-client/pull/200` is published
const apiKeyId: string = notifyAPIKey.substring(
  notifyAPIKey.length - 36,
  notifyAPIKey.length
)
const serviceId: string = notifyAPIKey.substring(
  notifyAPIKey.length - 73,
  notifyAPIKey.length - 37
)

export interface SendNotificationArgs {
  templateId: string
  emailAddress: string
  personalisation: { subject: string; body: string }
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
    'https://api.notifications.service.gov.uk/v2/notifications/email',
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
