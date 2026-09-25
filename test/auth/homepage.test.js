import { join } from 'node:path'

import Boom from '@hapi/boom'
import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'
import * as client from 'openid-client'

import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/services/formsService.js'
import { getSavedForms } from '~/src/server/services/submissionService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { citizenSession } from '~/test/utils/citizen-session.js'

jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/services/submissionService.js')
jest.mock('openid-client', () => ({
  ...jest.requireActual('openid-client'),
  discovery: jest.fn(),
  refreshTokenGrant: jest.fn()
}))

const HOMEPAGE_URL = '/homepage/test-form'
const NO_AUTH_URL = '/help/accessibility-statement/test-form'
const EMAIL = 'citizen@example.com'
const SUB = 'sub-1'
const FORM_ID = fixtures.form.metadata.id

/** A citizen who has signed in, as the citizen-session scheme presents them */
const credentials = {
  iss: 'http://localhost:3011',
  sub: SUB,
  email: EMAIL,
  accessToken: 'access-1',
  accessTokenExpiresAt: Date.now() + 300_000,
  refreshToken: 'refresh-1',
  idToken: 'id-1'
}

const identity = {
  iss: credentials.iss,
  sub: SUB,
  email: EMAIL
}

/**
 * The citizen's tokens, with an access token that has the given number of
 * seconds left
 * @param {number} secondsLeft
 */
function tokenSet(secondsLeft) {
  return {
    accessToken: 'access-1',
    accessTokenExpiresAt: Date.now() + secondsLeft * 1000,
    refreshToken: 'refresh-1',
    idToken: 'header.payload.signature'
  }
}

/** Two saved forms, as forms-submission-api describes them */
const savedForms = [
  {
    magicLinkId: 'link-1',
    referenceNumber: 'CCC-333',
    formTitle: 'test-form',
    createdAt: '2026-08-21T09:00:00.000Z',
    expireAt: '2026-09-12T09:00:00.000Z'
  },
  {
    magicLinkId: 'link-2',
    referenceNumber: 'AAA-111',
    formTitle: 'test-form',
    createdAt: '2026-09-09T09:00:00.000Z',
    expireAt: '2026-10-07T09:00:00.000Z'
  }
]

describe('per-form homepage', () => {
  /** @type {Server} */
  let server

  /** @type {ReturnType<typeof citizenSession>} */
  let session

  beforeAll(async () => {
    config.set('useSignInFeature', true)

    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, '..', 'form', 'definitions'),
      enforceCsrf: false
    })

    session = citizenSession(server)

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
    config.set('useSignInFeature', false)
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
    jest.mocked(getSavedForms).mockResolvedValue([])
    jest
      .mocked(client.discovery)
      .mockResolvedValue(/** @type {client.Configuration} */ ({}))
  })

  it('sends a signed-out citizen to sign in first', async () => {
    const response = await server.inject({
      method: 'GET',
      url: HOMEPAGE_URL
    })

    expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe(
      '/auth/sign-in?returnUrl=%2Fhomepage%2Ftest-form'
    )
  })

  it('answers not found for a form that does not exist', async () => {
    jest.mocked(getFormMetadata).mockRejectedValue(Boom.notFound())

    const response = await server.inject({
      method: 'GET',
      url: '/homepage/no-such-form',
      auth: { strategy: 'citizen-session', credentials }
    })

    expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
  })

  it('sends a signed-out citizen to sign in without checking the form exists', async () => {
    jest.mocked(getFormMetadata).mockRejectedValue(Boom.notFound())

    const response = await server.inject({
      method: 'GET',
      url: '/homepage/no-such-form'
    })

    expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe(
      '/auth/sign-in?returnUrl=%2Fhomepage%2Fno-such-form'
    )
  })

  it('shows the caption, the form name and the start button to a signed-in citizen', async () => {
    const { container } = await renderResponse(server, {
      method: 'GET',
      url: HOMEPAGE_URL,
      auth: { strategy: 'citizen-session', credentials }
    })

    expect(
      container.getByRole('heading', { name: 'Test form', level: 1 })
    ).toBeInTheDocument()

    const $start = container.getByRole('button', { name: 'Start a new form' })
    expect($start).toHaveAttribute('href', '/form/test-form')

    expect(
      container.queryByRole('region', { name: 'Important' })
    ).not.toBeInTheDocument()
  })

  it('shows the caption and the start button in Welsh on a Welsh homepage', async () => {
    jest.mocked(getFormDefinition).mockResolvedValue({
      ...fixtures.form.definition,
      metadata: { translations: { cy: {} } }
    })

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: `${HOMEPAGE_URL}?language=cy`,
      auth: { strategy: 'citizen-session', credentials }
    })

    expect(container.getByText('Rheoli eich ffurflen')).toBeInTheDocument()
    expect(
      container.getByRole('button', { name: 'Dechrau ffurflen newydd' })
    ).toBeInTheDocument()
  })

  it('shows the signed-in citizen’s email, linked to their homepage', async () => {
    const { container } = await renderResponse(server, {
      method: 'GET',
      url: HOMEPAGE_URL,
      auth: { strategy: 'citizen-session', credentials }
    })

    expect(container.getByRole('link', { name: EMAIL })).toHaveAttribute(
      'href',
      HOMEPAGE_URL
    )
  })

  describe('preview homepages', () => {
    it('sends a signed-out user to sign in, returning to the preview homepage', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/homepage/preview/draft/test-form'
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        '/auth/sign-in?returnUrl=%2Fhomepage%2Fpreview%2Fdraft%2Ftest-form'
      )
    })

    it('starts the draft preview form from the draft preview homepage', async () => {
      const { container } = await renderResponse(server, {
        method: 'GET',
        url: '/homepage/preview/draft/test-form',
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(
        container.getByRole('heading', { name: 'Test form', level: 1 })
      ).toBeInTheDocument()

      const $start = container.getByRole('button', { name: 'Start a new form' })
      expect($start).toHaveAttribute('href', '/form/preview/draft/test-form')
    })

    it('starts the live preview form from the live preview homepage', async () => {
      const { container } = await renderResponse(server, {
        method: 'GET',
        url: '/homepage/preview/live/test-form',
        auth: { strategy: 'citizen-session', credentials }
      })

      const $start = container.getByRole('button', { name: 'Start a new form' })
      expect($start).toHaveAttribute('href', '/form/preview/live/test-form')
    })

    it('links the signed-in user’s email to the preview homepage they are on', async () => {
      const { container } = await renderResponse(server, {
        method: 'GET',
        url: '/homepage/preview/draft/test-form',
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(container.getByRole('link', { name: EMAIL })).toHaveAttribute(
        'href',
        '/homepage/preview/draft/test-form'
      )
    })

    it('warns that a draft preview is not for personal information', async () => {
      const { container } = await renderResponse(server, {
        method: 'GET',
        url: '/homepage/preview/draft/test-form',
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(
        container.getByRole('region', { name: 'Important' })
      ).toHaveTextContent(
        'This is a preview of a draft form. Do not enter personal information.'
      )
    })

    it('warns that a live preview is not for personal information', async () => {
      const { container } = await renderResponse(server, {
        method: 'GET',
        url: '/homepage/preview/live/test-form',
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(
        container.getByRole('region', { name: 'Important' })
      ).toHaveTextContent(
        'This is a preview of a live form. Do not enter personal information.'
      )
    })

    it('rejects a state that is not draft or live', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/homepage/preview/banana/test-form',
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  it('shows a signed-out citizen no account control, on a page that does not gate on auth', async () => {
    // The account menu only says who is signed in, so a signed-out user sees
    // the plain header. They reach sign in through a page that requires it.
    const { container } = await renderResponse(server, {
      method: 'GET',
      url: NO_AUTH_URL
    })

    expect(
      container.queryByRole('link', { name: EMAIL })
    ).not.toBeInTheDocument()
  })

  it('shows no account control at all when the sign-in feature is off', async () => {
    config.set('useSignInFeature', false)

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: NO_AUTH_URL
    })

    config.set('useSignInFeature', true)

    expect(
      container.getByRole('heading', {
        name: 'Accessibility statement for this form',
        level: 1
      })
    ).toBeInTheDocument()
    expect(
      container.queryByRole('link', { name: 'Sign in' })
    ).not.toBeInTheDocument()
  })

  describe('the saved forms table', () => {
    it('lists a saved form under the headings the citizen needs', async () => {
      jest.mocked(getSavedForms).mockResolvedValue(savedForms)

      const { container } = await renderResponse(server, {
        method: 'GET',
        url: HOMEPAGE_URL,
        auth: { strategy: 'citizen-session', credentials }
      })

      const table = container.getByRole('table')

      expect(
        within(table).getByRole('columnheader', { name: 'Reference number' })
      ).toBeInTheDocument()
      expect(
        within(table).getByRole('columnheader', { name: 'Status' })
      ).toBeInTheDocument()
      expect(
        within(table).getByRole('columnheader', { name: 'Last updated' })
      ).toBeInTheDocument()
      expect(
        within(table).getByRole('columnheader', { name: 'Saved until' })
      ).toBeInTheDocument()

      expect(
        within(table).getByRole('cell', { name: 'CCC-333' })
      ).toBeInTheDocument()
      expect(
        within(table).getByRole('cell', { name: 'AAA-111' })
      ).toBeInTheDocument()

      // 09:00 UTC is 10:00am in British Summer Time
      expect(
        within(table).getByRole('cell', { name: '21 August 2026 at 10:00am' })
      ).toBeInTheDocument()
      expect(
        within(table).getByRole('cell', {
          name: '12 September 2026'
        })
      ).toBeInTheDocument()
    })

    it('writes the dates in Welsh on a Welsh homepage', async () => {
      jest.mocked(getSavedForms).mockResolvedValue(savedForms)
      jest.mocked(getFormDefinition).mockResolvedValue({
        ...fixtures.form.definition,
        metadata: { translations: { cy: {} } }
      })

      const { container } = await renderResponse(server, {
        method: 'GET',
        url: `${HOMEPAGE_URL}?language=cy`,
        auth: { strategy: 'citizen-session', credentials }
      })

      const table = container.getByRole('table')

      expect(
        within(table).getByRole('cell', { name: '21 Awst 2026 am 10:00yb' })
      ).toBeInTheDocument()
      expect(
        within(table).getByRole('cell', { name: '12 Medi 2026' })
      ).toBeInTheDocument()
    })

    it('tags a saved form past its expiry as expired, and the others as in progress', async () => {
      jest.useFakeTimers({
        now: new Date('2026-09-14T09:00:00.000Z'),
        advanceTimers: true
      })
      jest.mocked(getSavedForms).mockResolvedValue(savedForms)

      const { container } = await renderResponse(server, {
        method: 'GET',
        url: HOMEPAGE_URL,
        auth: { strategy: 'citizen-session', credentials }
      })

      jest.useRealTimers()

      const $expiredRow = container.getByRole('row', { name: /CCC-333/ })
      expect(
        within($expiredRow).getByRole('cell', { name: 'Expired' })
      ).toBeInTheDocument()
      expect(within($expiredRow).getByText('Expired')).toHaveClass(
        'govuk-tag--red'
      )

      const $activeRow = container.getByRole('row', { name: /AAA-111/ })
      expect(
        within($activeRow).getByRole('cell', { name: 'In progress' })
      ).toBeInTheDocument()
      expect(within($activeRow).getByText('In progress')).toHaveClass(
        'govuk-tag--teal'
      )
    })

    it('asks only for the forms of the citizen signed in, using their token', async () => {
      await renderResponse(server, {
        method: 'GET',
        url: HOMEPAGE_URL,
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(getSavedForms).toHaveBeenCalledWith(
        'access-1',
        fixtures.form.metadata.id
      )
    })

    describe('when the access token is about to expire', () => {
      /** @type {Awaited<ReturnType<typeof session.start>>} */
      let headers

      beforeEach(async () => {
        headers = await session.start(identity, tokenSet(20))
      })

      it('refreshes the token before asking for the saved forms', async () => {
        jest.mocked(client.refreshTokenGrant).mockResolvedValue(
          /** @type {TokenEndpointResponse & TokenEndpointResponseHelpers} */ (
            /** @type {unknown} */ ({
              access_token: 'access-2',
              id_token: 'header.payload.signature-2',
              expires_in: 300,
              token_type: 'bearer',
              claims: () => ({ sub: SUB })
            })
          )
        )

        const response = await server.inject({
          method: 'GET',
          url: HOMEPAGE_URL,
          headers
        })

        expect(response.statusCode).toBe(StatusCodes.OK)
        expect(client.refreshTokenGrant).toHaveBeenCalledWith(
          expect.anything(),
          'refresh-1',
          expect.objectContaining({ resource: expect.any(String) })
        )
        expect(getSavedForms).toHaveBeenCalledWith(
          'access-2',
          fixtures.form.metadata.id
        )
        await expect(session.read(headers)).resolves.toMatchObject({
          accessToken: 'access-2',
          refreshToken: 'refresh-1'
        })
      })

      it('sends the citizen to sign in again when the provider refuses the refresh token', async () => {
        jest.mocked(client.refreshTokenGrant).mockRejectedValue(
          new client.ResponseBodyError('server responded with an error', {
            cause: { error: 'invalid_grant' },
            response: new Response(null, { status: 400 })
          })
        )

        const response = await server.inject({
          method: 'GET',
          url: HOMEPAGE_URL,
          headers
        })

        expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
        expect(response.headers.location).toBe(
          '/auth/sign-in?returnUrl=%2Fhomepage%2Ftest-form'
        )
        expect(getSavedForms).not.toHaveBeenCalled()
        await expect(session.read(headers)).resolves.toBeNull()
      })

      it('uses the current token, and keeps the tokens, when the provider cannot be reached', async () => {
        jest
          .mocked(client.refreshTokenGrant)
          .mockRejectedValue(new TypeError('fetch failed'))

        const response = await server.inject({
          method: 'GET',
          url: HOMEPAGE_URL,
          headers
        })

        expect(response.statusCode).toBe(StatusCodes.OK)
        expect(getSavedForms).toHaveBeenCalledWith(
          'access-1',
          fixtures.form.metadata.id
        )
        await expect(session.read(headers)).resolves.toMatchObject({
          accessToken: 'access-1',
          refreshToken: 'refresh-1'
        })
      })

      it('answers service unavailable when the token has expired and the provider cannot be reached', async () => {
        jest
          .mocked(client.refreshTokenGrant)
          .mockRejectedValue(new TypeError('fetch failed'))
        const expiredHeaders = await session.start(identity, tokenSet(-10))

        const response = await server.inject({
          method: 'GET',
          url: HOMEPAGE_URL,
          headers: expiredHeaders
        })

        expect(response.statusCode).toBe(StatusCodes.SERVICE_UNAVAILABLE)
        expect(getSavedForms).not.toHaveBeenCalled()
        await expect(session.read(expiredHeaders)).resolves.toMatchObject({
          refreshToken: 'refresh-1'
        })
      })

      it('does not refresh the token for a static asset', async () => {
        await server.inject({
          method: 'GET',
          url: '/stylesheets/application.css',
          headers
        })

        expect(client.refreshTokenGrant).not.toHaveBeenCalled()
        await expect(session.read(headers)).resolves.toMatchObject({
          accessToken: 'access-1'
        })
      })
    })

    it('sends the citizen to sign in again when their session has no tokens', async () => {
      const headers = await session.start(identity, null)

      const response = await server.inject({
        method: 'GET',
        url: HOMEPAGE_URL,
        headers
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        '/auth/sign-in?returnUrl=%2Fhomepage%2Ftest-form'
      )
    })

    it('shows a Continue link for each form in progress', async () => {
      jest.useFakeTimers({
        now: new Date('2026-09-01T09:00:00.000Z'),
        advanceTimers: true
      })
      jest.mocked(getSavedForms).mockResolvedValue(savedForms)

      const { container } = await renderResponse(server, {
        method: 'GET',
        url: HOMEPAGE_URL,
        auth: { strategy: 'citizen-session', credentials }
      })

      const table = container.getByRole('table')

      expect(
        within(table).getByRole('columnheader', { name: 'Actions' })
      ).toBeInTheDocument()

      // The reference number in each link name tells the links apart
      expect(
        within(table).getByRole('link', { name: 'Continue CCC-333' })
      ).toHaveAttribute('href', `/resume-form/${FORM_ID}/link-1`)
      expect(
        within(table).getByRole('link', { name: 'Continue AAA-111' })
      ).toHaveAttribute('href', `/resume-form/${FORM_ID}/link-2`)

      jest.useRealTimers()
    })

    it('names a Continue link by its saved time when the form has no reference number', async () => {
      jest.useFakeTimers({
        now: new Date('2026-09-01T09:00:00.000Z'),
        advanceTimers: true
      })
      jest.mocked(getSavedForms).mockResolvedValue([
        {
          magicLinkId: 'link-1',
          formTitle: 'test-form',
          createdAt: '2026-08-21T09:00:00.000Z',
          expireAt: '2026-09-12T09:00:00.000Z'
        }
      ])

      const { container } = await renderResponse(server, {
        method: 'GET',
        url: HOMEPAGE_URL,
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(
        container.getByRole('link', {
          name: 'Continue saved on 21 August 2026 at 10:00am'
        })
      ).toHaveAttribute('href', `/resume-form/${FORM_ID}/link-1`)

      jest.useRealTimers()
    })

    it('shows no Continue link for an expired form', async () => {
      jest.useFakeTimers({
        now: new Date('2026-09-14T09:00:00.000Z'),
        advanceTimers: true
      })
      jest.mocked(getSavedForms).mockResolvedValue(savedForms)

      const { container } = await renderResponse(server, {
        method: 'GET',
        url: HOMEPAGE_URL,
        auth: { strategy: 'citizen-session', credentials }
      })

      const table = container.getByRole('table')

      // link-1 expired on 12 September
      expect(
        within(table).getAllByRole('link', { name: /Continue/ })
      ).toHaveLength(1)
      expect(
        within(table).getByRole('link', { name: 'Continue AAA-111' })
      ).toHaveAttribute('href', `/resume-form/${FORM_ID}/link-2`)

      jest.useRealTimers()
    })

    it('shows the Actions column in Welsh on a Welsh homepage', async () => {
      jest.useFakeTimers({
        now: new Date('2026-09-01T09:00:00.000Z'),
        advanceTimers: true
      })
      jest.mocked(getSavedForms).mockResolvedValue(savedForms)
      jest.mocked(getFormDefinition).mockResolvedValue({
        ...fixtures.form.definition,
        metadata: { translations: { cy: {} } }
      })

      const { container } = await renderResponse(server, {
        method: 'GET',
        url: `${HOMEPAGE_URL}?language=cy`,
        auth: { strategy: 'citizen-session', credentials }
      })

      const table = container.getByRole('table')

      expect(
        within(table).getByRole('columnheader', { name: 'Camau' })
      ).toBeInTheDocument()
      expect(
        within(table).getByRole('link', { name: 'Parhau CCC-333' })
      ).toBeInTheDocument()

      jest.useRealTimers()
    })

    it('says so plainly when the citizen has saved nothing, rather than showing an empty table', async () => {
      const { container } = await renderResponse(server, {
        method: 'GET',
        url: HOMEPAGE_URL,
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(container.queryByRole('table')).not.toBeInTheDocument()
      expect(
        container.getByText('You have no forms in progress.')
      ).toBeInTheDocument()
    })
  })

  describe('page width', () => {
    it('gives the homepage the room its table needs, and leaves other pages alone', async () => {
      const homepage = await server.inject({
        method: 'GET',
        url: HOMEPAGE_URL,
        auth: { strategy: 'citizen-session', credentials }
      })

      // On the body, so the header, navigation, content and footer all move
      // together rather than leaving a seam
      expect(homepage.payload).toContain('app-page--wide')

      const otherPage = await server.inject({
        method: 'GET',
        url: NO_AUTH_URL
      })

      expect(otherPage.payload).not.toContain('app-page--wide')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { TokenEndpointResponse, TokenEndpointResponseHelpers } from 'openid-client'
 */
