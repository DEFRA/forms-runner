import { join } from 'node:path'

import { submit } from '@defra/forms-engine-plugin/services/formSubmissionService.js'
import { FormAction } from '@defra/forms-engine-plugin/types'
import { Engine as CatboxMemory } from '@hapi/catbox-memory'
import hapi from '@hapi/hapi'
import { StatusCodes } from 'http-status-codes'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/services/formsService.js'
import {
  generateReferenceNumber,
  getSavedForms
} from '~/src/server/services/submissionService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { citizenSession } from '~/test/utils/citizen-session.js'
import { getCookie } from '~/test/utils/get-cookie.js'

jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/services/submissionService.js')
jest.mock('~/src/server/messaging/publish.js')
jest.mock('~/src/server/messaging/formAdapterEventPublisher.ts')
jest.mock('@defra/forms-engine-plugin/services/formSubmissionService.js')
jest.mock('openid-client', () => ({
  ...jest.requireActual('openid-client'),
  discovery: jest.fn(),
  refreshTokenGrant: jest.fn()
}))

const basePath = `${FORM_PREFIX}/basic`
const HOMEPAGE_URL = '/homepage/basic'
const SESSION_ID_URL = '/test/session-id'

const SESSION_TIMEOUT = config.get('sessionTimeout')
const CONFIRMATION_SESSION_TIMEOUT = config.get('confirmationSessionTimeout')
const HOUR = 60 * 60 * 1000
const FULL_NAME = 'Firstname Lastname'

const metadata = { ...fixtures.form.metadata, slug: 'basic' }

const identity = {
  iss: 'http://localhost:3011',
  sub: 'sub-1',
  email: 'citizen@example.com'
}

/**
 * The session cookie that a response sets, with its attributes
 * @param {ServerInjectResponse} response
 */
function sessionCookie(response) {
  return [response.headers['set-cookie'] ?? []]
    .flat()
    .find((header) => header.startsWith('session='))
}

/**
 * The time that the server sees. The cache compares the stored time and the
 * time limit of each entry to this time. When a test moves this time
 * forward, the entries expire immediately.
 */
let now = 0

/**
 * Moves the server's time forward
 * @param {number} ms
 */
function moveTimeForward(ms) {
  now += ms
}

/**
 * Signs the citizen in. The access token stays valid for longer than a test.
 * @param {ReturnType<typeof citizenSession>} session
 */
function signIn(session) {
  return session.start(identity, {
    accessToken: 'access-1',
    accessTokenExpiresAt: now + 7 * 24 * HOUR,
    refreshToken: 'refresh-1',
    idToken: 'header.payload.signature'
  })
}

/**
 * Answers all the questions in the form
 * @param {Server} server
 * @param {Pick<OutgoingHttpHeaders, 'cookie'>} headers
 */
async function answerQuestions(server, headers) {
  await server.inject({
    method: 'POST',
    url: `${basePath}/licence`,
    headers,
    payload: { licenceLength: 1 }
  })

  await server.inject({
    method: 'POST',
    url: `${basePath}/full-name`,
    headers,
    payload: { fullName: FULL_NAME }
  })
}

/**
 * Asserts that the homepage shows. This means that the citizen is signed in.
 * @param {Server} server
 * @param {Pick<OutgoingHttpHeaders, 'cookie'>} headers
 */
async function expectSignedIn(server, headers) {
  const { container } = await renderResponse(server, {
    url: HOMEPAGE_URL,
    headers
  })

  expect(
    container.getByRole('heading', { name: 'Test form', level: 1 })
  ).toBeInTheDocument()
}

/**
 * Asserts that the homepage sends the citizen to sign in
 * @param {Server} server
 * @param {Pick<OutgoingHttpHeaders, 'cookie'>} headers
 */
async function expectSignedOut(server, headers) {
  const response = await server.inject({ url: HOMEPAGE_URL, headers })

  expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
  expect(response.headers.location).toBe(
    `/auth/sign-in?returnUrl=${encodeURIComponent(HOMEPAGE_URL)}`
  )
}

/**
 * Asserts that the check answers page shows the answers from
 * `answerQuestions`
 * @param {Server} server
 * @param {Pick<OutgoingHttpHeaders, 'cookie'>} headers
 */
async function expectAnswersKept(server, headers) {
  const { container } = await renderResponse(server, {
    url: `${basePath}/summary`,
    headers
  })

  expect(
    container.getByRole('heading', { name: 'Summary', level: 1 })
  ).toBeInTheDocument()
  expect(container.getByText(FULL_NAME)).toBeInTheDocument()
}

/**
 * Asserts that the check answers page sends the citizen to the first question
 * @param {Server} server
 * @param {Pick<OutgoingHttpHeaders, 'cookie'>} headers
 */
async function expectAnswersGone(server, headers) {
  const response = await server.inject({
    url: `${basePath}/summary`,
    headers
  })

  expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
  expect(response.headers.location).toBe(`${basePath}/licence`)
}

describe('Session expiry', () => {
  /** @type {Server} */
  let server

  /** @type {ReturnType<typeof citizenSession>} */
  let session

  beforeAll(async () => {
    config.set('useSignInFeature', true)

    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      enforceCsrf: false
    })

    session = citizenSession(server)

    server.route({
      method: 'GET',
      path: SESSION_ID_URL,
      options: { auth: false },
      handler: (request) => request.yar.id
    })

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
    config.set('useSignInFeature', false)
  })

  beforeEach(() => {
    now = Date.now()
    jest.spyOn(Date, 'now').mockImplementation(() => now)

    jest.mocked(getFormMetadata).mockResolvedValue(metadata)
    jest.mocked(getFormDefinition).mockResolvedValue(fixtures.form.definition)
    jest.mocked(getSavedForms).mockResolvedValue([])
    jest.mocked(generateReferenceNumber).mockResolvedValue('XXX-XXX-XXX')
    jest
      .mocked(client.discovery)
      .mockResolvedValue(/** @type {client.Configuration} */ ({}))
  })

  describe('yar session, server side', () => {
    it('signs the citizen out after SESSION_TIMEOUT with no request', async () => {
      const headers = await signIn(session)
      await expectSignedIn(server, headers)

      moveTimeForward(SESSION_TIMEOUT + 1)

      await expectSignedOut(server, headers)
    })

    it('keeps the citizen signed in after the first time limit when they make requests', async () => {
      const headers = await signIn(session)

      moveTimeForward(SESSION_TIMEOUT - HOUR)
      await expectSignedIn(server, headers)

      moveTimeForward(SESSION_TIMEOUT - HOUR)
      await expectSignedIn(server, headers)
    })

    it('signs the citizen out when only routes with auth set to false get requests', async () => {
      const headers = await signIn(session)

      moveTimeForward(SESSION_TIMEOUT - HOUR)

      // The test build has no assets, so the response is 404. The route runs
      // without auth, as in production.
      await server.inject({ url: '/assets/images/favicon.ico', headers })

      moveTimeForward(HOUR + 1)

      await expectSignedOut(server, headers)
    })
  })

  describe('yar session, cookie side', () => {
    it('sets an HttpOnly cookie that ends when the browser closes', async () => {
      const response = await server.inject({ url: `${basePath}/licence` })

      const cookie = sessionCookie(response)

      expect(cookie).toContain('HttpOnly')
      expect(cookie).not.toMatch(/Expires=|Max-Age=/)
    })

    it('sets a Secure cookie in production', async () => {
      // The plugin reads isProduction when its module loads. Thus the test
      // changes the setting, then loads a new copy of the module.
      await jest.isolateModulesAsync(async () => {
        const { config } = await import('~/src/config/index.js')
        config.set('isProduction', true)

        const { default: pluginSession } =
          await import('~/src/server/plugins/session.js')

        const productionServer = hapi.server({
          cache: [{ name: 'session', engine: new CatboxMemory() }]
        })
        await productionServer.register(pluginSession)
        productionServer.route({
          method: 'GET',
          path: '/page',
          handler: () => null
        })
        await productionServer.initialize()

        const response = await productionServer.inject({ url: '/page' })
        await productionServer.stop()

        expect(sessionCookie(response)).toContain('Secure')
      })
    })

    it('starts a new session when the cookie is not valid', async () => {
      const response = await server.inject({
        url: `${basePath}/licence`,
        headers: { cookie: 'session=not-a-sealed-cookie' }
      })

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(getCookie(response, 'session')).not.toBe('not-a-sealed-cookie')
    })

    it('keeps the session id from the cookie after the server-side session expires', async () => {
      const headers = await signIn(session)

      const idBefore = await server.inject({ url: SESSION_ID_URL, headers })

      moveTimeForward(SESSION_TIMEOUT + 1)

      const idAfter = await server.inject({ url: SESSION_ID_URL, headers })

      expect(idAfter.payload).toBe(idBefore.payload)
      await expectSignedOut(server, headers)
    })
  })

  describe('form state', () => {
    it('removes the answers after SESSION_TIMEOUT with no request', async () => {
      const headers = await signIn(session)
      await answerQuestions(server, headers)
      await expectAnswersKept(server, headers)

      moveTimeForward(SESSION_TIMEOUT + 1)

      await expectAnswersGone(server, headers)
    })

    it('removes the answers SESSION_TIMEOUT after the last write, but page reads keep the citizen signed in', async () => {
      const headers = await signIn(session)
      await answerQuestions(server, headers)

      moveTimeForward(SESSION_TIMEOUT - HOUR)
      await expectAnswersKept(server, headers)

      moveTimeForward(HOUR + 1)

      await expectAnswersGone(server, headers)
      await expectSignedIn(server, headers)
    })

    it('keeps the answers after the first time limit when the citizen changes an answer', async () => {
      const headers = await signIn(session)
      await answerQuestions(server, headers)

      moveTimeForward(SESSION_TIMEOUT - HOUR)
      await server.inject({
        method: 'POST',
        url: `${basePath}/full-name`,
        headers,
        payload: { fullName: FULL_NAME }
      })

      moveTimeForward(SESSION_TIMEOUT - HOUR)

      await expectAnswersKept(server, headers)
    })

    it('removes the confirmation after CONFIRMATION_SESSION_TIMEOUT', async () => {
      jest.mocked(submit).mockResolvedValue({
        message: 'Submit completed',
        result: {
          files: {
            main: '00000000-0000-0000-0000-000000000000',
            repeaters: {}
          }
        }
      })

      const headers = await signIn(session)
      await answerQuestions(server, headers)

      const submitResponse = await server.inject({
        method: 'POST',
        url: `${basePath}/summary`,
        headers,
        payload: { action: FormAction.Send }
      })

      expect(submitResponse.headers.location).toBe(`${basePath}/status`)

      const { container } = await renderResponse(server, {
        url: `${basePath}/status`,
        headers
      })

      expect(
        container.getByRole('heading', { name: 'Form submitted', level: 1 })
      ).toBeInTheDocument()

      moveTimeForward(CONFIRMATION_SESSION_TIMEOUT + 1)

      const expiredResponse = await server.inject({
        url: `${basePath}/status`,
        headers
      })

      expect(expiredResponse.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(expiredResponse.headers.location).toBe(`${basePath}/licence`)
    })
  })
})

/**
 * @import { Server, ServerInjectResponse } from '@hapi/hapi'
 * @import { OutgoingHttpHeaders } from 'node:http'
 */
