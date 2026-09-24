import { getTokens, setTokens } from '~/src/server/auth/accountSession.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const SESSION_PROBE_PATH = '/test/citizen-session'

/**
 * Tests sign a citizen in by injecting credentials, which leaves the session
 * without the tokens the callback would have saved there. This puts the given
 * tokens in the session of any request whose session has none, other than
 * the probe that reads them back. Register it before the server is
 * initialised.
 * @param {Server} server
 */
export function seedCitizenTokens(server) {
  /** @type {TokenSet | null} */
  let tokens = null

  server.ext('onPreHandler', (request, h) => {
    if (
      tokens &&
      request.path !== SESSION_PROBE_PATH &&
      !getTokens(request.yar)
    ) {
      setTokens(request.yar, tokens)
    }

    return h.continue
  })

  server.route({
    method: 'GET',
    path: SESSION_PROBE_PATH,
    options: { auth: false },
    handler: (request) => getTokens(request.yar)
  })

  return {
    /**
     * Sets the tokens later requests start with, or none
     * @param {TokenSet | null} value
     */
    set(value) {
      tokens = value
    },

    /**
     * Reads the tokens the session holds after a request, using the session
     * cookie that request set
     * @param {ServerInjectResponse} response
     * @returns {Promise<TokenSet | null>}
     */
    async read(response) {
      const probe = await server.inject({
        method: 'GET',
        url: SESSION_PROBE_PATH,
        headers: getCookieHeader(response, ['session'])
      })

      return /** @type {TokenSet | null} */ (probe.result)
    }
  }
}

/**
 * @import { Server, ServerInjectResponse } from '@hapi/hapi'
 * @import { TokenSet } from '~/src/server/auth/accountSession.js'
 */
