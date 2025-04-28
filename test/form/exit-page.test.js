import { join } from 'node:path'

import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/demo-cph-number`

jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')

describe('Exit pages', () => {
  const journey = [
    {
      heading1: 'Are you 18 or older?',

      paths: {
        current: '/are-you-18-or-older',
        next: '/are-you-or-your-business-already-registered-with-the-rural-payments-agency',
        exit: '/you-must-be-18-or-older-to-use-this-service'
      },

      fields: [
        {
          name: 'JGLmzy',
          title: '18 or older',
          payload: {
            valid: { JGLmzy: 'true' },
            invalid: { JGLmzy: 'false' }
          }
        }
      ]
    },
    {
      heading1:
        'Are you or your business already registered with the Rural Payments Agency?',

      paths: {
        current:
          '/are-you-or-your-business-already-registered-with-the-rural-payments-agency',
        next: '/what-country-will-you-keep-livestock-in',
        exit: '/already-registered-with-the-rural-payments-agency'
      },

      fields: [
        {
          name: 'zcjEtV',
          title: 'Registered with the Rural Payments Agency',
          payload: {
            valid: { zcjEtV: 'false' },
            invalid: { zcjEtV: 'true' }
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
      formFilePath: join(import.meta.dirname, 'definitions'),
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

      it('should redirect to the exit page on submit (answer: No)', async () => {
        const payload = {}

        for (const field of fields) {
          Object.assign(payload, field.payload.invalid)
        }

        // Submit form with populated values
        const response = await server.inject({
          url: `${basePath}${paths.current}`,
          method: 'POST',
          headers,
          payload: { ...payload, crumb: csrfToken }
        })

        expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(response.headers.location).toBe(`${basePath}${paths.exit}`)
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
          expect(response.headers.location).toBe(`${basePath}${paths.exit}`)
        }
      )

      it('should prevent access to the summary page (after exit)', async () => {
        const response = await server.inject({
          url: `${basePath}/summary`,
          headers
        })

        // Redirect back to exit page (without return URL)
        expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
        expect(response.headers.location).toBe(`${basePath}${paths.exit}`)
      })

      it('should redirect to the next page on submit (answer: Yes)', async () => {
        const payload = {}

        for (const field of fields) {
          Object.assign(payload, field.payload.valid)
        }

        // Submit form with populated values
        const response1 = await server.inject({
          url: `${basePath}${paths.current}`,
          method: 'POST',
          headers,
          payload: { ...payload, crumb: csrfToken }
        })

        // Redirect to next page
        expect(response1.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(response1.headers.location).toBe(`${basePath}${paths.next}`)
      })

      it('should prevent access to the summary page (after continue)', async () => {
        const response = await server.inject({
          url: `${basePath}/summary`,
          headers
        })

        // Redirect back to relevant page (with return URL)
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
