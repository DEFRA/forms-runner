import * as httpService from '~/src/server/services/httpService.js'
import { WebhookService } from '~/src/server/services/webhookService.js'

describe('Server WebhookService Service', () => {
  test('Webhook returns correct reference when payload is string', async () => {
    jest.spyOn(httpService, 'post').mockResolvedValue({
      res: {},
      payload: JSON.stringify({ reference: '1234' })
    })
    const loggerSpy = {
      error: () => jest.fn(),
      info: () => jest.fn(),
      debug: () => jest.fn()
    }
    const serverMock = { logger: loggerSpy }
    const webHookeService = new WebhookService(serverMock)
    const result = await webHookeService.postRequest('/url', {})
    expect(result).toBe('1234')
  })

  test('Webhook returns correct reference when payload is object', async () => {
    jest.spyOn(httpService, 'post').mockResolvedValue({
      res: {},
      payload: { reference: 'ABCD' }
    })
    const loggerSpy = {
      error: () => jest.fn(),
      info: () => jest.fn(),
      debug: () => jest.fn()
    }
    const serverMock = { logger: loggerSpy }
    const webHookeService = new WebhookService(serverMock)
    const result = await webHookeService.postRequest('/url', {})
    expect(result).toBe('ABCD')
  })
})
