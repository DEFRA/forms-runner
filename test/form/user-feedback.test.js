import { join } from 'node:path'

import { SummaryPageController } from '@defra/forms-engine-plugin/controllers/SummaryPageController.js'
import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'
import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import {
  getFormMetadata,
  getFormMetadataById
} from '~/src/server/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/messaging/publish.js')
jest.mock('@defra/forms-engine-plugin/services/formSubmissionService.js')
jest.mock('@defra/forms-engine-plugin/controllers/SummaryPageController.js')

const basePath = `${FORM_PREFIX}/user-feedback-with-custom-controller`

const metadata = {
  ...fixtures.form.metadata,
  notificationEmail: undefined
}

describe('User feedback journey', () => {
  const journey = [
    /**
     * Pre-page
     */
    {
      // No title/name yet as URL saves param state and forwards to proper start page

      paths: {
        current: '/give-feedback?formId=some-form-id'
      }
    },

    /**
     * Question page 1
     */
    {
      formName: 'Test form',

      heading1: 'Give feedback',

      paths: {
        current: '/give-feedback',
        next: '/status'
      },

      fields: [
        {
          title:
            'Overall, how do you feel about the service you received today?',
          text: 'How do you feel about the service',
          payload: {
            empty: { PMPyjg: '', AiBocn: '', formId: '' },
            valid: {
              PMPyjg: 'Very satisfied',
              AiBocn: 'some extra text',
              formId: '123'
            }
          },

          errors: {
            empty: 'Select how you feel about the service'
          }
        }
      ]
    },

    /**
     * Submitted
     */
    {
      formName: 'Test form',

      heading1: 'Feedback submitted',

      paths: {
        current: '/status',
        previous: '/give-feedback'
      }
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
    jest.mocked(getFormMetadataById).mockResolvedValue(metadata)
    jest.mocked(getFormMetadata).mockResolvedValue(metadata)
    server = await createServer({
      formFileName: 'user-feedback-with-custom-controller.js',
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
    jest.clearAllMocks()
    jest.mocked(getFormMetadata).mockResolvedValue(metadata)
    jest.mocked(getFormMetadataById).mockResolvedValue(metadata)
    jest
      .spyOn(SummaryPageController.prototype, 'handleFormSubmit')
      .mockImplementation((request, _context, h) => {
        const cacheService = getCacheService(request.server)
        // Should be able to void this but linter still doesnt like it
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const dummy = Promise.resolve(
          cacheService.setConfirmationState(request, {
            confirmed: true,
            formId: 'dummyId'
          })
        )
        return Promise.resolve(h.redirect(`${basePath}/status`))
      })
  })

  afterAll(async () => {
    await server.stop()
  })

  describe.each(journey)(
    'Page: $paths.current',
    ({ formName, heading1, paths, fields = [] }) => {
      beforeEach(async () => {
        ;({ container } = await renderResponse(server, {
          url: `${basePath}${paths.current}`,
          headers
        }))
      })

      it('dummy test in case no activated tests in this beforeEach loop', () => {
        expect(paths.current).toBeDefined()
      })

      if (heading1) {
        it('should render the page heading', () => {
          const $heading = container.getByRole('heading', {
            name: heading1,
            level: 1
          })

          expect($heading).toBeInTheDocument()
        })
      }

      if (formName) {
        it('should render the form title', () => {
          const $title = container.getByRole('link', {
            name: formName
          })

          expect($title).toBeInTheDocument()
        })
      }

      if (paths.next) {
        it('should show errors when invalid on submit', async () => {
          const payload = {}

          for (const field of fields) {
            Object.assign(payload, field.payload.empty)
          }

          // Submit form with empty values
          const { container, response } = await renderResponse(server, {
            url: `${basePath}${paths.current}`,
            method: 'POST',
            headers,
            payload: { ...payload, crumb: csrfToken }
          })

          expect(response.statusCode).toBe(StatusCodes.OK)
          expect(response.headers.location).toBeUndefined()

          const $errorSummary = container.getByRole('alert')
          const $errorItems = within($errorSummary).getAllByRole('listitem')

          const $heading = within($errorSummary).getByRole('heading', {
            name: 'There is a problem',
            level: 2
          })

          expect($heading).toBeInTheDocument()

          for (const [index, { errors }] of fields.entries()) {
            expect($errorItems[index]).toHaveTextContent(errors.empty)
          }
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
      }
    }
  )
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { BoundFunctions, queries } from '@testing-library/dom'
 */
