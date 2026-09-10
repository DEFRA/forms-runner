import { join } from 'node:path'

import Boom from '@hapi/boom'
import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'
import { getSavedForms } from '~/src/server/services/savedFormsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/services/savedFormsService.js')

const HOMEPAGE_URL = '/homepage/test-form'
const NO_AUTH_URL = '/help/accessibility-statement/test-form'
const EMAIL = 'citizen@example.com'

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
})

/**
 * @import { Server } from '@hapi/hapi'
 */
