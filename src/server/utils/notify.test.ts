import { postJson } from '~/src/server/services/httpService.js'
import { sendNotification } from '~/src/server/utils/notify.js'

jest.mock('~/src/server/services/httpService')

describe('Utils: Notify', () => {
  const templateId = 'example-template-id'
  const emailAddress = 'enrique.chase@defra.gov.uk'
  const personalisation = {
    subject: 'Hello',
    body: 'World'
  }

  describe('sendNotification', () => {
    it('calls postJson with personalised email payload', async () => {
      await sendNotification({
        templateId,
        emailAddress,
        personalisation
      })

      expect(postJson).toHaveBeenCalledWith(
        'https://api.notifications.service.gov.uk/v2/notifications/email',
        {
          payload: {
            template_id: templateId,
            email_address: emailAddress,
            personalisation
          },
          headers: {
            Authorization: expect.stringMatching(/^Bearer /)
          }
        }
      )
    })
  })
})
