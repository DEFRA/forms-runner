import { StatusService } from '~/src/server/services/index.js'

describe('Status Service', () => {
  const cacheService = { getState: () => ({}), mergeState: () => {} }
  const webhookService = { postRequest: () => ({}) }
  const notifyService = { sendNotification: () => ({}) }
  const payService = {
    payStatus: () => {}
  }

  const yar = {
    id: 'session_id'
  }

  const app = {
    forms: {
      test: {
        feeOptions: {
          allowSubmissionWithoutPayment: true,
          maxAttempts: 3
        }
      }
    }
  }

  /** @type {import('@hapi/hapi').Server} */
  const server = {
    services: () => ({
      cacheService,
      webhookService,
      payService,
      notifyService
    }),
    logger: {
      info: () => {},
      trace: () => {}
    },
    app
  }

  describe('shouldShowPayErrorPage', () => {
    test('returns false when no pay information is saved in the session', async () => {
      const statusService = new StatusService(server)
      expect(await statusService.shouldShowPayErrorPage({ yar })).toBe(false)
    })

    test('returns false when the continue query parameter is true', async () => {
      jest
        .spyOn(cacheService, 'getState')
        .mockReturnValue({ state: { pay: {} } })

      const statusService = new StatusService(server)

      expect(
        await statusService.shouldShowPayErrorPage({
          yar,
          query: { continue: 'true' },
          params: {
            id: 'test'
          }
        })
      ).toBe(false)
    })

    test('returns false when 3 pay attempts have been made', async () => {
      jest
        .spyOn(cacheService, 'getState')
        .mockReturnValue({ state: { pay: { meta: 3 } } })

      const statusService = new StatusService(server)

      expect(
        await statusService.shouldShowPayErrorPage({
          yar,
          app,
          params: { id: 'test' }
        })
      ).toBe(false)
    })

    test('returns true when <3 pay attempts have been made', async () => {
      jest
        .spyOn(cacheService, 'getState')
        .mockReturnValue({ pay: { meta: { attempts: 1 } } })

      jest.spyOn(payService, 'payStatus').mockReturnValue({
        state: {
          status: 'failed'
        }
      })

      const statusService = new StatusService(server)
      expect(
        await statusService.shouldShowPayErrorPage({
          yar,
          app,
          params: { id: 'test' },
          server
        })
      ).toBe(true)
    })

    test('returns true when >3 pay attempts have been made and form does not allow submissions without payment', async () => {
      jest
        .spyOn(cacheService, 'getState')
        .mockReturnValue({ pay: { meta: { attempts: 5 } } })

      jest.spyOn(payService, 'payStatus').mockReturnValue({
        state: {
          status: 'failed'
        }
      })

      jest.replaceProperty(app, 'forms', {
        test: {
          feeOptions: {
            allowSubmissionWithoutPayment: false,
            maxAttempts: 3
          }
        }
      })

      const statusService = new StatusService(server)
      expect(
        await statusService.shouldShowPayErrorPage({
          yar,
          app,
          params: { id: 'test' },
          server
        })
      ).toBe(true)
    })

    test('returns true when <3 and the continue query is true', async () => {
      jest
        .spyOn(cacheService, 'getState')
        .mockReturnValue({ pay: { meta: { attempts: 1 } } })

      jest.spyOn(payService, 'payStatus').mockReturnValue({
        state: {
          status: 'failed'
        }
      })

      const statusService = new StatusService(server)
      expect(
        await statusService.shouldShowPayErrorPage({
          yar,
          app,
          params: {
            id: 'test'
          },
          query: { continue: 'true' },
          server
        })
      ).toBe(false)
    })
  })

  describe('outputRequests', () => {
    const notifyOutput = {
      outputData: {
        type: 'notify',

        apiKey: 'a',
        templateId: 'b',
        emailAddress: 'c',
        personalisation: {},
        addReferencesToPersonalisation: false
      }
    }
    const firstWebhook = {
      type: 'webhook',
      outputData: { url: 'abc' }
    }
    const webhookOutput = {
      type: 'webhook',
      outputData: { url: '' }
    }
    const outputs = [firstWebhook, webhookOutput, webhookOutput, notifyOutput]
    const state = {
      webhookData: { metadata: {} },
      outputs,
      pay: { meta: { attempts: 1 } }
    }

    test('makes and returns correct output requests', async () => {
      jest.spyOn(cacheService, 'getState').mockReturnValue(state)

      jest
        .spyOn(webhookService, 'postRequest')
        .mockResolvedValueOnce('abcd-ef-g')
        .mockRejectedValueOnce()
        .mockResolvedValueOnce('3')

      const statusService = new StatusService(server)
      const res = await statusService.outputRequests({ yar })

      const results = await res.results
      expect(res.reference).toBe('abcd-ef-g')
      expect(results).toHaveLength(outputs.length - 1)
      expect(results.map((result) => result.status)).toEqual([
        'fulfilled',
        'rejected',
        'fulfilled'
      ])
      expect(results[2].value).toBe('3')
    })
  })
})
