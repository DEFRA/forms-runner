import { join } from 'node:path'

import {
  CURRENT_PAGE_PATH_KEY,
  STATE_NOT_YET_VALIDATED
} from '@defra/forms-engine-plugin'
import { FormAction } from '@defra/forms-engine-plugin/types'
import { StatusCodes } from 'http-status-codes'

import { config } from '~/src/config/index.js'
import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { publishSaveAndExitV2Event } from '~/src/server/messaging/publish.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/services/formsService.js'
import { generateReferenceNumber } from '~/src/server/services/submissionService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { citizenSession } from '~/test/utils/citizen-session.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/services/submissionService.js')
jest.mock('~/src/server/messaging/publish.js')

const basePath = `${FORM_PREFIX}/basic`
const SAVE_AND_EXIT_URL = '/save-and-exit/basic'

const metadata = { ...fixtures.form.metadata, slug: 'basic' }

const identity = {
  iss: 'http://localhost:3011',
  sub: 'sub-1',
  email: 'citizen@example.com'
}

const tokens = {
  accessToken: 'access-1',
  accessTokenExpiresAt: Date.now() + 300_000,
  refreshToken: 'refresh-1',
  idToken: 'id-1'
}

describe('Save and exit with citizen sign-in', () => {
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

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
    config.set('useSignInFeature', false)
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(metadata)
    jest.mocked(getFormDefinition).mockResolvedValue(fixtures.form.definition)
    jest.mocked(generateReferenceNumber).mockResolvedValue('XXX-XXX-XXX')
  })

  describe('signed in', () => {
    it('saves the answers, including the answers on the current page', async () => {
      const headers = await session.start(identity, tokens)

      await server.inject({
        method: 'POST',
        url: `${basePath}/licence`,
        headers,
        payload: { licenceLength: 1 }
      })

      const saveAndExit = await server.inject({
        method: 'POST',
        url: `${basePath}/full-name`,
        headers,
        payload: { fullName: 'Jo Bloggs', action: FormAction.SaveAndExit }
      })

      expect(saveAndExit.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(saveAndExit.headers.location).toBe(SAVE_AND_EXIT_URL)

      const { response, container } = await renderResponse(server, {
        url: SAVE_AND_EXIT_URL,
        headers
      })

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(
        container.getByRole('heading', {
          name: 'Your progress has been saved',
          level: 1
        })
      ).toBeInTheDocument()
      expect(publishSaveAndExitV2Event).toHaveBeenCalledWith(
        expect.anything(),
        identity.email,
        expect.anything(),
        expect.objectContaining({
          licenceLength: 1,
          [STATE_NOT_YET_VALIDATED]: expect.objectContaining({
            fullName: 'Jo Bloggs',
            [CURRENT_PAGE_PATH_KEY]: `${basePath}/full-name`
          })
        }),
        undefined
      )
    })
  })

  describe('signed out', () => {
    it('keeps the answers on the current page while the citizen signs in', async () => {
      const licence = await server.inject({
        method: 'POST',
        url: `${basePath}/licence`,
        payload: { licenceLength: 1 }
      })
      const headers = getCookieHeader(licence, ['session'])

      const saveAndExit = await server.inject({
        method: 'POST',
        url: `${basePath}/full-name`,
        headers,
        payload: { fullName: 'Jo Bloggs', action: FormAction.SaveAndExit }
      })

      expect(saveAndExit.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(saveAndExit.headers.location).toBe(SAVE_AND_EXIT_URL)

      const { container } = await renderResponse(server, {
        url: SAVE_AND_EXIT_URL,
        headers
      })

      expect(
        container.getByRole('heading', {
          name: 'Sign in to save your progress',
          level: 1
        })
      ).toBeInTheDocument()

      await session.start(identity, tokens, headers)

      const signedIn = await server.inject({ url: SAVE_AND_EXIT_URL, headers })

      expect(signedIn.statusCode).toBe(StatusCodes.OK)
      expect(publishSaveAndExitV2Event).toHaveBeenCalledWith(
        expect.anything(),
        identity.email,
        expect.anything(),
        expect.objectContaining({
          [STATE_NOT_YET_VALIDATED]: expect.objectContaining({
            fullName: 'Jo Bloggs',
            [CURRENT_PAGE_PATH_KEY]: `${basePath}/full-name`
          })
        }),
        undefined
      )
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
