import { StatusCodes } from 'http-status-codes'

export default /** @type {ServerRoute} */ ({
  method: 'GET',
  path: '/health',
  handler(_, h) {
    return h.response({ message: 'success' }).code(StatusCodes.OK)
  }
})

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
