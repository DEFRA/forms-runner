import {
  getTokens,
  setIdentity,
  setTokens
} from '~/src/server/auth/accountSession.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const SESSION_SEED_PATH = '/test/citizen-session/seed'
const SESSION_PROBE_PATH = '/test/citizen-session/tokens'

/**
 * Tests that inject credentials skip the citizen-session scheme, so they
 * cannot test what it does with the tokens. This puts a citizen and their
 * tokens in a real session instead, so the scheme runs on each request that
 * sends its cookie. Register it before the server is initialised.
 * @param {Server} server
 */
export function citizenSession(server) {
  server.route({
    method: 'POST',
    path: SESSION_SEED_PATH,
    options: { auth: false },
    handler: (request) => {
      const { identity, tokens } = /** @type {SessionSeed} */ (request.payload)

      setIdentity(request.yar, identity)

      if (tokens) {
        setTokens(request.yar, tokens)
      }

      return null
    }
  })

  server.route({
    method: 'GET',
    path: SESSION_PROBE_PATH,
    options: { auth: false },
    handler: (request) => getTokens(request.yar)
  })

  return {
    /**
     * Starts a session for the citizen, returning the cookie header that
     * sends it
     * @param {Identity} identity
     * @param {TokenSet | null} tokens
     */
    async start(identity, tokens) {
      const response = await server.inject({
        method: 'POST',
        url: SESSION_SEED_PATH,
        payload: { identity, tokens }
      })

      return getCookieHeader(response, ['session'])
    },

    /**
     * Reads the tokens the session holds
     * @param {Pick<OutgoingHttpHeaders, 'cookie'>} headers - from `start`
     * @returns {Promise<TokenSet | null>}
     */
    async read(headers) {
      const probe = await server.inject({
        method: 'GET',
        url: SESSION_PROBE_PATH,
        headers
      })

      return /** @type {TokenSet | null} */ (probe.result)
    }
  }
}

/**
 * @typedef {object} SessionSeed
 * @property {Identity} identity - the citizen, as the callback keeps them
 * @property {TokenSet | null} tokens - their tokens, or none for a session
 *   from before the tokens were kept
 */

/**
 * @import { Server } from '@hapi/hapi'
 * @import { OutgoingHttpHeaders } from 'node:http'
 * @import { Identity, TokenSet } from '~/src/server/auth/accountSession.js'
 */
