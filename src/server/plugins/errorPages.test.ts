import { isServerError } from '~/src/server/plugins/errorPages.js'

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
