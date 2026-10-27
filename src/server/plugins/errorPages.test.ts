import { checkFormStatus } from '@defra/forms-engine-plugin/engine/helpers.js'
import Boom from '@hapi/boom'
import { type Request, type ResponseToolkit, type Server } from '@hapi/hapi'

import errorPages, { isServerError } from '~/src/server/plugins/errorPages.js'

jest.mock('@defra/forms-engine-plugin/engine/helpers.js')
jest.mock('~/src/server/utils/utils.js', () => ({
  getAllLanguages: jest.fn().mockReturnValue([]),
  resolveLanguage: jest.fn().mockReturnValue('en')
}))

describe('errorPages', () => {
  it.each([500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511])(
    'should return true for value %i in server error range',
    (statusCode) => {
      expect(isServerError(statusCode)).toBe(true)
    }
  )
  it.each([0, 200, 301, 304, 400, 404])(
    'should return false for value %i outside server error range',
    (statusCode) => {
      expect(isServerError(statusCode)).toBe(false)
    }
  )
})

describe('errorPages onPreResponse', () => {
  const view = jest.fn()
  const code = jest.fn()
  const logger = { error: jest.fn(), info: jest.fn() }
  const h = { view, continue: Symbol('continue') } as unknown as ResponseToolkit

  function getHandler() {
    let handler: (request: Request, h: ResponseToolkit) => unknown = jest.fn()
    const server = {
      ext: jest.fn((_event: string, fn: typeof handler) => {
        handler = fn
      })
    } as unknown as Server
    errorPages.plugin.register(server)
    return handler
  }

  function buildRequest(response: unknown) {
    return {
      response,
      app: {},
      query: {},
      params: {},
      path: '/some/path',
      method: 'get',
      yar: {},
      logger
    } as unknown as Request
  }

  beforeEach(() => {
    jest.clearAllMocks()
    code.mockReturnValue('rendered')
    view.mockReturnValue({ code })
    jest.mocked(checkFormStatus).mockReturnValue({ isPreview: false } as never)
  })

  it('logs the original Boom stack trace when present', () => {
    const boom = Boom.internal('Something broke')
    boom.stack = 'Error: original\n    at original.ts:1:1'

    getHandler()(buildRequest(boom), h)

    const [loggedError] = logger.error.mock.calls[0] as [Error]
    expect(loggedError.stack).toBe(boom.stack)
  })

  it('falls back to the locally created stack trace when the Boom error has none', () => {
    const boom = Boom.internal('Something broke')
    boom.stack = undefined

    getHandler()(buildRequest(boom), h)

    const [loggedError] = logger.error.mock.calls[0] as [Error]
    expect(loggedError.message).toBe('HTTP 500 error: Something broke')
    expect(loggedError.stack).toEqual(expect.stringContaining('HTTP 500 error'))
  })
})
