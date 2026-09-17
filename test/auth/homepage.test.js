import { join } from 'node:path'

import Boom from '@hapi/boom'
import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/services/formsService.js'
import { getSavedForms } from '~/src/server/services/submissionService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/services/submissionService.js')

const HOMEPAGE_URL = '/homepage/test-form'
const NO_AUTH_URL = '/help/accessibility-statement/test-form'
const EMAIL = 'citizen@example.com'
const FORM_ID = fixtures.form.metadata.id

/** A citizen who has signed in, as the citizen-session scheme presents them */
const credentials = {
  iss: 'http://localhost:3011',
  sub: 'sub-1',
  email: EMAIL,
  idToken: 'header.payload.signature',
  accessToken: 'access-1'
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

  beforeAll(async () => {
    config.set('useSignInFeature', true)

    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, '..', 'form', 'definitions'),
      enforceCsrf: false
    })

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
    config.set('useSignInFeature', false)
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
    jest.mocked(getSavedForms).mockResolvedValue([])
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

    it('gives each form in progress a link that resumes it', async () => {
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

      const links = within(table).getAllByRole('link', { name: /Continue/ })

      expect(links).toHaveLength(2)

      // Each row's link needs its own accessible name, so a screen reader
      // user can tell rows apart when several links all read "Continue".
      expect(
        within(table).getByRole('link', { name: /Continue\s+CCC-333/ })
      ).toHaveAttribute('href', `/resume-form/${FORM_ID}/link-1`)
      expect(
        within(table).getByRole('link', { name: /Continue\s+AAA-111/ })
      ).toHaveAttribute('href', `/resume-form/${FORM_ID}/link-2`)

      jest.useRealTimers()
    })

    it('leaves out the resume link of an expired form, which cannot be resumed', async () => {
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

      // `link-1` expired on 12 September, `link-2` has not.
      const links = within(table).getAllByRole('link', { name: /Continue/ })

      expect(links).toHaveLength(1)
      expect(
        within(table).getByRole('link', { name: /Continue\s+AAA-111/ })
      ).toHaveAttribute('href', `/resume-form/${FORM_ID}/link-2`)

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
 */
