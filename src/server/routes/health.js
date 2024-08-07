export default /** @type {ServerRoute} */ ({
  method: 'GET',
  path: '/health',
  handler(_, h) {
    return h.response({ message: 'success' }).code(200)
  }
})

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
