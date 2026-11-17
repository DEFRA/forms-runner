import { FormStatus } from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'

import { config } from '~/src/config/index.js'
import { FormRowStatus } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { linkEarlierSubmissions } from '~/src/server/routes/homepage.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/services/formsService.js'
import { getFormRecords } from '~/src/server/services/submissionService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/services/submissionService.js')
jest.mock('~/src/server/routes/homepage.js', () => ({
  __esModule: true,
  ...jest.requireActual('~/src/server/routes/homepage.js'),
  linkEarlierSubmissions: jest.fn()
}))

describe('Auth routes', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    config.set('useSignInFeature', true)

    server = await createServer({
      enforceCsrf: false
    })
    await server.initialize()
  })

  const credentials = {
    iss: 'http://localhost:3011',
    sub: 'sub-1',
    email: 'citizen@example.com',
    idToken: 'header.payload.signature',
    accessToken: 'access-1',
    accessTokenExpiresAt: 1,
    refreshToken: 'refresh-old'
  }

  describe('GET /signin-required/{slug}', () => {
    beforeEach(() => {
      jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
      jest.mocked(getFormDefinition).mockResolvedValue({
        ...fixtures.form.definition,
        metadata: { translations: { cy: {} } }
      })
    })

    test('get route responds OK in en-GB', async () => {
      const options = {
        method: 'GET',
        url: '/signin-required/my-slug?returnUrl=%2Fform%2Fmy-slug%2Fpage-one',
        auth: { strategy: 'citizen-session', credentials }
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)

      const $heading = container.getByRole('heading', { level: 1 })

      expect($heading).toBeInTheDocument()
      expect($heading).toHaveTextContent('Sign in to use this form')

      const $button = container.getByRole('button', { name: 'Sign in' })

      expect($button).toBeInTheDocument()
      expect($button).toHaveAttribute(
        'href',
        '/auth/sign-in?returnUrl=%2Fauth%2Fvia-homepage%2Fform%2Fmy-slug%2Fpage-one'
      )
    })

    test('get route responds OK in cy', async () => {
      const options = {
        method: 'GET',
        url: '/signin-required/my-slug?returnUrl=%2Fform%2Fmy-slug%2Fpage-one&language=cy',
        auth: { strategy: 'citizen-session', credentials }
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)

      const $heading = container.getByRole('heading', { level: 1 })

      expect($heading).toBeInTheDocument()
      expect($heading).toHaveTextContent(
        "Mewngofnodwch i ddefnyddio'r ffurflen hon"
      )

      const $button = container.getByRole('button', { name: 'Mewngofnodi' })

      expect($button).toBeInTheDocument()
      expect($button).toHaveAttribute(
        'href',
        '/auth/sign-in?returnUrl=%2Fauth%2Fvia-homepage%2Fform%2Fmy-slug%2Fpage-one'
      )
    })
  })

  describe('GET /auth/via-homepage/form live', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
      jest.mocked(getFormDefinition).mockResolvedValue({
        ...fixtures.form.definition,
        metadata: { options: { allowCopy: true } }
      })
      jest.mocked(getFormRecords).mockResolvedValue([])
      jest.mocked(linkEarlierSubmissions).mockResolvedValue(undefined)
    })

    test('links earlier submissions before continuing when none are submitted', async () => {
      jest
        .mocked(getFormRecords)
        // @ts-expect-error - partial data mock
        .mockResolvedValue([{ status: FormRowStatus.InProgress }])

      const response = await server.inject({
        method: 'GET',
        url: '/auth/via-homepage/form/test-form/page-one',
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/form/test-form')
      expect(linkEarlierSubmissions).toHaveBeenCalledWith(
        credentials.accessToken,
        fixtures.form.metadata.id
      )
      expect(getFormRecords).toHaveBeenCalledWith(
        credentials.accessToken,
        fixtures.form.metadata.id,
        undefined
      )
    })

    test('sends preview users with submitted forms to the preview homepage', async () => {
      jest
        .mocked(getFormRecords)
        // @ts-expect-error - partial data mock
        .mockResolvedValue([{ status: FormRowStatus.Submitted }])

      const response = await server.inject({
        method: 'GET',
        url: '/auth/via-homepage/form/test-form/page-one',
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/homepage/test-form')
      expect(getFormDefinition).toHaveBeenCalledWith(
        fixtures.form.metadata.id,
        FormStatus.Live
      )
    })

    test('continues directly to the form when copying is disabled', async () => {
      jest.mocked(getFormDefinition).mockResolvedValue(fixtures.form.definition)

      const response = await server.inject({
        method: 'GET',
        url: '/auth/via-homepage/form/test-form/page-one',
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/form/test-form')
      expect(linkEarlierSubmissions).not.toHaveBeenCalled()
      expect(getFormRecords).not.toHaveBeenCalled()
    })
  })

  describe('GET /auth/via-homepage/form preview', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
      jest.mocked(getFormDefinition).mockResolvedValue({
        ...fixtures.form.definition,
        metadata: { options: { allowCopy: true } }
      })
      jest.mocked(getFormRecords).mockResolvedValue([])
      jest.mocked(linkEarlierSubmissions).mockResolvedValue(undefined)
    })

    test('links earlier submissions before continuing when none are submitted', async () => {
      jest
        .mocked(getFormRecords)
        // @ts-expect-error - partial data mock
        .mockResolvedValue([{ status: FormRowStatus.InProgress }])

      const response = await server.inject({
        method: 'GET',
        url: '/auth/via-homepage/form/preview/draft/test-form/page-one',
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/form/preview/draft/test-form')
      expect(linkEarlierSubmissions).toHaveBeenCalledWith(
        credentials.accessToken,
        fixtures.form.metadata.id
      )
      expect(getFormRecords).toHaveBeenCalledWith(
        credentials.accessToken,
        fixtures.form.metadata.id,
        FormStatus.Draft
      )
    })

    test('sends preview users with submitted forms to the preview homepage', async () => {
      jest
        .mocked(getFormRecords)
        // @ts-expect-error - partial data mock
        .mockResolvedValue([{ status: FormRowStatus.Submitted }])

      const response = await server.inject({
        method: 'GET',
        url: '/auth/via-homepage/form/preview/draft/test-form/page-one',
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        '/homepage/preview/draft/test-form'
      )
      expect(getFormDefinition).toHaveBeenCalledWith(
        fixtures.form.metadata.id,
        FormStatus.Draft
      )
    })

    test('continues directly to the form when copying is disabled', async () => {
      jest.mocked(getFormDefinition).mockResolvedValue(fixtures.form.definition)

      const response = await server.inject({
        method: 'GET',
        url: '/auth/via-homepage/form/preview/draft/test-form/page-one',
        auth: { strategy: 'citizen-session', credentials }
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/form/preview/draft/test-form')
      expect(linkEarlierSubmissions).not.toHaveBeenCalled()
      expect(getFormRecords).not.toHaveBeenCalled()
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
