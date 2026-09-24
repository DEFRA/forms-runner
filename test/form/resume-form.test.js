import { join } from 'node:path'

import { FormStatus, SecurityQuestionsEnum } from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'

import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
import {
  getFormDefinition,
  getFormMetadata,
  getFormMetadataById
} from '~/src/server/services/formsService.js'
import {
  getSaveAndExitDetails,
  getSavedFormState,
  getSavedForms,
  validateSaveAndExitCredentials
} from '~/src/server/services/submissionService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { seedCitizenTokens } from '~/test/utils/citizen-session.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/services/submissionService.js')

const MAGIC_LINK_ID = 'fd4e6453-fb32-43e4-b4cf-12b381a713de'

const metadata = { ...fixtures.form.metadata, slug: 'basic' }

/** The answers that were saved */
const savedState = {
  $$__referenceNumber: 'AAA-111',
  licenceLength: 8,
  fullName: 'Firstname Lastname'
}

const savedLinkForm = {
  id: metadata.id,
  status: FormStatus.Live,
  isPreview: false,
  baseUrl: 'http://localhost:3009'
}

/**
 * Opens the success page and follows its button to the summary page
 * @param {Server} server
 * @param {ServerInjectOptions} options - the request that restores the form
 */
async function followToSummary(server, options) {
  const { response } = await renderResponse(server, options)

  expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
  expect(response.headers.location).toBe('/resume-form-success/basic')

  const headers = getCookieHeader(response, 'session')

  const { container: successPage } = await renderResponse(server, {
    url: '/resume-form-success/basic',
    headers
  })

  expect(
    successPage.getByRole('heading', {
      name: 'Welcome back to your form',
      level: 1
    })
  ).toBeInTheDocument()

  const $resumeButton = successPage.getByRole('button', {
    name: 'Resume form'
  })

  expect($resumeButton).toHaveAttribute('href', '/form/basic/summary')

  const { container: summaryPage } = await renderResponse(server, {
    url: '/form/basic/summary',
    headers
  })

  return summaryPage
}

describe('Resume a saved form', () => {
  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(metadata)
    jest.mocked(getFormMetadataById).mockResolvedValue(metadata)
    jest.mocked(getFormDefinition).mockResolvedValue(fixtures.form.definition)
  })

  describe('with a memorable word', () => {
    /** @type {Server} */
    let server

    beforeAll(async () => {
      server = await createServer({
        formFileName: 'basic.js',
        formFilePath: join(import.meta.dirname, 'definitions'),
        enforceCsrf: false
      })

      await server.initialize()
    })

    afterAll(async () => {
      await server.stop()
    })

    it('restores the answers after the citizen enters the memorable word', async () => {
      jest.mocked(getSaveAndExitDetails).mockResolvedValue({
        authType: 'memorableWord',
        form: savedLinkForm,
        question: SecurityQuestionsEnum.MemorablePlace,
        invalidPasswordAttempts: 0
      })
      jest.mocked(validateSaveAndExitCredentials).mockResolvedValue({
        form: savedLinkForm,
        question: SecurityQuestionsEnum.MemorablePlace,
        invalidPasswordAttempts: 0,
        state: savedState,
        magicLinkGroupId: 'group-1',
        validPassword: true
      })

      // The link in the email
      const { response } = await renderResponse(server, {
        url: `/resume-form/${metadata.id}/${MAGIC_LINK_ID}`
      })

      const verifyUrl = `/resume-form-verify/${metadata.id}/${MAGIC_LINK_ID}/basic`

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(verifyUrl)

      const { container: verifyPage } = await renderResponse(server, {
        url: verifyUrl
      })

      expect(
        verifyPage.getByRole('heading', {
          name: 'Continue with your form',
          level: 1
        })
      ).toBeInTheDocument()

      const summaryPage = await followToSummary(server, {
        method: 'POST',
        url: verifyUrl,
        payload: { securityAnswer: 'Paris' }
      })

      expect(validateSaveAndExitCredentials).toHaveBeenCalledWith(
        MAGIC_LINK_ID,
        'Paris'
      )
      expect(summaryPage.getByText('8 day')).toBeInTheDocument()
      expect(summaryPage.getByText('Firstname Lastname')).toBeInTheDocument()
    })
  })

  describe('with citizen sign-in', () => {
    /** @type {Server} */
    let server

    const credentials = {
      iss: 'http://localhost:3011',
      sub: 'sub-1',
      email: 'citizen@example.com'
    }

    /** @type {ReturnType<typeof seedCitizenTokens>} */
    let sessionTokens

    beforeAll(async () => {
      config.set('useSignInFeature', true)

      server = await createServer({
        formFileName: 'basic.js',
        formFilePath: join(import.meta.dirname, 'definitions'),
        enforceCsrf: false
      })

      sessionTokens = seedCitizenTokens(server)
      await server.initialize()
    })

    afterAll(async () => {
      await server.stop()
      config.set('useSignInFeature', false)
    })

    beforeEach(() => {
      sessionTokens.set({
        accessToken: 'access-1',
        accessTokenExpiresAt: Date.now() + 300_000,
        refreshToken: 'refresh-1',
        idToken: 'header.payload.signature'
      })
    })

    it('restores the answers after a signed-in citizen selects Continue on the homepage', async () => {
      jest.mocked(getSavedForms).mockResolvedValue([
        {
          magicLinkId: MAGIC_LINK_ID,
          referenceNumber: 'AAA-111',
          formTitle: 'Test form',
          createdAt: new Date().toISOString(),
          expireAt: new Date(Date.now() + 86_400_000).toISOString()
        }
      ])
      jest.mocked(getSaveAndExitDetails).mockResolvedValue({
        authType: 'citizenSignIn',
        form: savedLinkForm
      })
      jest.mocked(getSavedFormState).mockResolvedValue({
        state: savedState,
        magicLinkGroupId: 'group-1'
      })

      const auth = { strategy: 'citizen-session', credentials }

      const { container: homepage } = await renderResponse(server, {
        url: '/homepage/basic',
        auth
      })

      const $continueLink = homepage.getByRole('link', {
        name: 'Continue AAA-111'
      })

      const summaryPage = await followToSummary(server, {
        url: /** @type {string} */ ($continueLink.getAttribute('href')),
        auth
      })

      expect(getSavedFormState).toHaveBeenCalledWith('access-1', MAGIC_LINK_ID)
      expect(summaryPage.getByText('8 day')).toBeInTheDocument()
      expect(summaryPage.getByText('Firstname Lastname')).toBeInTheDocument()
    })
  })
})

/**
 * @import { Server, ServerInjectOptions } from '@hapi/hapi'
 */
