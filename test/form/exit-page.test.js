import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { StatusCodes } from 'http-status-codes'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const testDir = dirname(fileURLToPath(import.meta.url))
const basePath = '/demo-cph-number'

jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')

describe('Exit pages', () => {
  const journey = [
    {
      heading1: 'Are you 18 or older?',

      paths: {
        current: '/are-you-18-or-older',
        next: '/you-must-be-18-or-older-to-use-this-service'
      },

      fields: [
        {
          name: 'JGLmzy',
          title: '18 or older',
          payload: {
            valid: { JGLmzy: 'false' }
          }
        }
      ]
    }
  ]

  /** @type {Server} */
  let server

  /** @type {string} */
  let csrfToken

  /** @type {ReturnType<typeof getCookieHeader>} */
  let headers

  /** @type {BoundFunctions<typeof queries>} */
  let container

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'demo-cph-number.js',
      formFilePath: join(testDir, 'definitions'),
      enforceCsrf: true
    })

    await server.initialize()

    // Navigate to start
    const response = await server.inject({
      url: `${basePath}${journey[0].paths.current}`
    })

    // Extract the session cookie
    csrfToken = getCookie(response, 'crumb')
    headers = getCookieHeader(response, ['session', 'crumb'])
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  describe.each(journey)(
    'Page: $paths.current',
    ({ heading1, paths, fields = [] }) => {
      beforeEach(async () => {
        ;({ container } = await renderResponse(server, {
          url: `${basePath}${paths.current}`,
          headers
        }))
      })

      it('should render the page heading', () => {
        const $heading = container.getByRole('heading', {
          name: heading1,
          level: 1
        })

        expect($heading).toBeInTheDocument()
      })

      it('should redirect to the next page on submit', async () => {
        const payload = {}

        for (const field of fields) {
          Object.assign(payload, field.payload.valid)
        }

        // Submit form with populated values
        const response = await server.inject({
          url: `${basePath}${paths.current}`,
          method: 'POST',
          headers,
          payload: { ...payload, crumb: csrfToken }
        })

        expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
        expect(response.headers.location).toBe(`${basePath}${paths.next}`)
      })

      it.each([
        { path: '/what-country-will-you-keep-livestock-in' },
        { path: '/what-type-of-business-do-you-have' },
        { path: '/what-is-the-main-purpose-of-your-business' },

        // Other pages etc, including summary
        { path: '/summary' }
      ])(
        'should prevent access to the other pages (after exit)',
        async ({ path }) => {
          const response = await server.inject({
            url: `${basePath}${path}`,
            headers
          })

          // Redirect back to exit page
          expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
          expect(response.headers.location).toBe(`${basePath}${paths.next}`)
        }
      )

      it('should prevent access to the summary page (after exit)', async () => {
        const response = await server.inject({
          url: `${basePath}/summary`,
          headers
        })

        // Redirect back to exit page
        expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
        expect(response.headers.location).toBe(`${basePath}${paths.next}`)
      })
    }
  )
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { BoundFunctions, queries } from '@testing-library/dom'
 */
