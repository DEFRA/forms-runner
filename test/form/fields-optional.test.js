import { join } from 'node:path'

import { StatusCodes } from 'http-status-codes'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = '/fields-optional'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Form fields (optional)', () => {
  const journey = [
    {
      heading1: 'Fields optional',

      paths: {
        current: '/components',
        next: '/summary'
      },

      fields: [
        {
          name: 'textField',
          title: 'Text field',
          payload: {
            empty: { textField: '' }
          }
        },
        {
          title: 'Multiline text field',
          value: 'Example multiline text field',
          payload: {
            empty: { multilineTextField: '' }
          }
        },
        {
          title: 'Number field',
          payload: {
            empty: { numberField: '' }
          }
        },
        {
          name: 'datePartsField',
          title: 'Date parts field',
          payload: {
            empty: {
              datePartsField__day: '',
              datePartsField__month: '',
              datePartsField__year: ''
            }
          }
        },
        {
          name: 'monthYearField',
          title: 'Month year field',
          payload: {
            empty: {
              monthYearField__month: '',
              monthYearField__year: ''
            }
          }
        },
        {
          name: 'yesNoField',
          title: 'Yes/No field',
          payload: {
            empty: {}
          }
        },
        {
          name: 'emailAddressField',
          title: 'Email address field',
          payload: {
            empty: { emailAddressField: '' }
          }
        },
        {
          name: 'telephoneNumberField',
          title: 'Telephone number field',
          payload: {
            empty: { telephoneNumberField: '' }
          }
        },
        {
          name: 'addressField',
          title: 'Address field',
          payload: {
            empty: {
              addressField__addressLine1: '',
              addressField__addressLine2: '',
              addressField__town: '',
              addressField__postcode: ''
            }
          }
        },
        {
          name: 'radiosField',
          title: 'Radios field',
          payload: {
            empty: {}
          }
        },
        {
          name: 'selectField',
          title: 'Select field',
          payload: {
            empty: { selectField: '' }
          }
        },
        {
          name: 'autocompleteField',
          title: 'Autocomplete field',
          payload: {
            empty: { autocompleteField: '' }
          }
        },
        {
          name: 'checkboxesSingle',
          title: 'Checkboxes field 1',
          payload: {
            empty: {}
          }
        },
        {
          name: 'checkboxesMultiple',
          title: 'Checkboxes field 2',
          payload: {
            empty: {}
          }
        },
        {
          name: 'checkboxesSingleNumber',
          title: 'Checkboxes field 3 (number)',
          payload: {
            empty: {}
          }
        },
        {
          name: 'checkboxesMultipleNumber',
          title: 'Checkboxes field 4 (number)',
          payload: {
            empty: {}
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
      formFileName: 'fields-optional.js',
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

      it('should redirect to the next page on submit', async () => {
        const payload = {}

        for (const field of fields) {
          Object.assign(payload, field.payload.empty)
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
  )
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { BoundFunctions, queries } from '@testing-library/dom'
 */
