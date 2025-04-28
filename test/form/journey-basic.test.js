import { join } from 'node:path'

import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { submit } from '~/src/server/plugins/engine/services/formSubmissionService.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import { FormAction } from '~/src/server/routes/types.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/basic`

jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')

describe('Form journey', () => {
  const journey = [
    /**
     * Question page 1
     */
    {
      heading1: 'Buy a rod fishing licence',
      heading2: 'Licence details',

      paths: {
        current: '/licence',
        next: '/full-name'
      },

      fields: [
        {
          title: 'Which fishing licence do you want to get?',
          text: '1 day',
          payload: {
            empty: { licenceLength: '' },
            valid: { licenceLength: '1' }
          },

          errors: {
            empty: 'Select which fishing licence do you want to get?'
          }
        }
      ]
    },

    /**
     * Question page 2
     */
    {
      heading1: "What's your name?",
      heading2: 'Personal details',

      paths: {
        current: '/full-name',
        previous: '/licence',
        next: '/summary'
      },

      fields: [
        {
          title: "What's your name?",
          text: 'Firstname Lastname',
          payload: {
            empty: { fullName: '' },
            valid: { fullName: 'Firstname Lastname' }
          },

          errors: {
            empty: "Enter what's your name?"
          }
        }
      ]
    },

    /**
     * Check answers
     */
    {
      heading1: 'Summary',

      paths: {
        current: '/summary',
        previous: '/full-name'
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
    server = await createServer({
      formFileName: 'basic.js',
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
    // server.app.models.clear()
    jest.clearAllMocks()
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  describe.each(journey)(
    'Page: $paths.current',
    ({ heading1, heading2, paths, fields = [] }) => {
      beforeEach(async () => {
        ;({ container } = await renderResponse(server, {
          url: `${basePath}${paths.current}`,
          headers
        }))
      })

      if (paths.previous) {
        it('should render the back link', () => {
          const $backLink = container.getByRole('link', {
            name: 'Back'
          })

          expect($backLink).toBeInTheDocument()
          expect($backLink).toHaveAttribute(
            'href',
            `${basePath}${paths.previous}`
          )
        })
      }

      it('should render the page heading', () => {
        const $heading = container.getByRole('heading', {
          name: heading1,
          level: 1
        })

        expect($heading).toBeInTheDocument()
      })

      if (heading2) {
        it('should render the page subheading', () => {
          const $heading = container.getByRole('heading', {
            name: heading2,
            level: 2
          })

          expect($heading).toBeInTheDocument()
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

          expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
          expect(response.headers.location).toBe(`${basePath}${paths.next}`)
        })
      }
    }
  )

  describe('Page: /summary', () => {
    /** @type {HTMLElement[]} */
    let $titles

    /** @type {HTMLElement[]} */
    let $values

    /** @type {HTMLElement[]} */
    let $actions

    beforeEach(async () => {
      ;({ container } = await renderResponse(server, {
        url: `${basePath}/summary`,
        headers
      }))

      $titles = container.queryAllByRole('term')

      // Field values
      $values = container
        .queryAllByRole('definition')
        .filter(({ classList }) =>
          classList.contains('govuk-summary-list__value')
        )

      // Change links
      $actions = container
        .queryAllByRole('definition')
        .filter(({ classList }) =>
          classList.contains('govuk-summary-list__actions')
        )
    })

    it('should render the page heading with email notification warning', () => {
      const $heading = container.getByRole('heading', {
        name: 'Summary',
        level: 1
      })
      const $warning = container.getByRole('link', {
        name: 'enter the email address (opens in new tab)'
      })

      expect($warning).toBeInTheDocument()
      expect($heading).toBeInTheDocument()
    })

    it('should render each section heading', () => {
      const $section1 = container.getByRole('heading', {
        name: journey[0].heading2,
        level: 2
      })

      const $section2 = container.getByRole('heading', {
        name: journey[1].heading2,
        level: 2
      })

      expect($section1).toBeInTheDocument()
      expect($section2).toBeInTheDocument()
    })

    it('should render field values', () => {
      for (const { fields = [] } of journey) {
        for (const detail of fields) {
          const index = $titles.findIndex(
            ({ textContent }) => textContent?.trim() === detail.title
          )

          // Check for field title and value
          expect($titles[index]).toHaveTextContent(detail.title)
          expect($values[index]).toHaveTextContent(detail.text)
        }
      }
    })

    it('should render field change links', async () => {
      for (const { fields = [], paths } of journey) {
        for (const detail of fields) {
          const index = $titles.findIndex(
            ({ textContent }) => textContent?.trim() === detail.title
          )

          /** @satisfies {HTMLAnchorElement} */
          const $changeLink = within($actions[index]).getByRole('link', {
            name: `Change ${detail.title}`
          })

          const returnUrl = `${basePath}/summary`

          // Check for change link
          expect($changeLink).toBeInTheDocument()
          expect($changeLink).toHaveAttribute(
            'href',
            `${basePath}${paths.current}?returnUrl=${encodeURIComponent(returnUrl)}`
          )

          // Follow change link
          const response1 = await server.inject({
            url: $changeLink.href,
            headers
          })

          expect(response1.statusCode).toBe(StatusCodes.OK)

          const payload = {}

          for (const field of fields) {
            Object.assign(payload, field.payload.valid)
          }

          // Submit and redirect back to summary page
          const response2 = await server.inject({
            url: $changeLink.href,
            method: 'POST',
            headers,
            payload: { ...payload, crumb: csrfToken }
          })

          expect(response2.statusCode).toBe(StatusCodes.SEE_OTHER)
          expect(response2.headers.location).toBe(returnUrl)
        }
      }
    })

    it('should prevent access to the complete page before submit', async () => {
      const response = await server.inject({
        url: `${basePath}/status`,
        headers
      })

      // Redirect back to start
      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(`${basePath}/licence`)
    })

    it('should redirect to the complete page on submit', async () => {
      jest.mocked(submit).mockResolvedValueOnce({
        message: 'Submit completed',
        result: {
          files: {
            main: '00000000-0000-0000-0000-000000000000',
            repeaters: {}
          }
        }
      })

      const response = await server.inject({
        url: `${basePath}/summary`,
        method: 'POST',
        headers,
        payload: {
          crumb: csrfToken,
          action: FormAction.Send
        }
      })

      expect(submit).toHaveBeenCalledWith({
        main: [
          {
            name: 'licenceLength',
            title: 'Which fishing licence do you want to get?',
            value: '1'
          },
          {
            name: 'fullName',
            title: "What's your name?",
            value: 'Firstname Lastname'
          }
        ],
        repeaters: [],
        retrievalKey: 'enrique.chase@defra.gov.uk',
        sessionId: expect.any(String)
      })

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe(`${basePath}/status`)

      const { container } = await renderResponse(server, {
        url: `${basePath}/status`,
        headers
      })

      const $heading1 = container.getByRole('heading', {
        name: 'Form submitted',
        level: 1
      })

      const $heading2 = container.getByRole('heading', {
        name: 'What happens next',
        level: 2
      })

      expect($heading1).toBeInTheDocument()
      expect($heading2).toBeInTheDocument()
    })

    it('should redirect back to start (after submit)', async () => {
      const response = await server.inject({
        url: `${basePath}/summary`,
        headers
      })

      // Redirect back to start
      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(`${basePath}/licence`)
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { BoundFunctions, queries } from '@testing-library/dom'
 */
