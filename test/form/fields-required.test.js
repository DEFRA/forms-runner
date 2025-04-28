import { join } from 'node:path'

import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/fields-required`

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Form fields (required)', () => {
  const journey = [
    {
      heading1: 'Fields required',

      paths: {
        current: '/components',
        next: '/summary'
      },

      fields: [
        {
          name: 'textField',
          title: 'Text field',
          payload: {
            empty: { textField: '' },
            valid: { textField: 'Example text field' }
          }
        },
        {
          title: 'Multiline text field',
          value: 'Example multiline text field',
          payload: {
            empty: { multilineTextField: '' },
            valid: { multilineTextField: 'Example multiline text field' }
          }
        },
        {
          title: 'Number field',
          payload: {
            empty: { numberField: '' },
            valid: { numberField: '1234' }
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
            },
            valid: {
              datePartsField__day: '31',
              datePartsField__month: '12',
              datePartsField__year: '2021'
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
            },
            valid: {
              monthYearField__month: '12',
              monthYearField__year: '2021'
            }
          }
        },
        {
          name: 'yesNoField',
          title: 'Yes/No field',
          payload: {
            empty: {},
            valid: { yesNoField: 'true' }
          }
        },
        {
          name: 'emailAddressField',
          title: 'Email address field',
          payload: {
            empty: { emailAddressField: '' },
            valid: { emailAddressField: 'defra.helpline@defra.gov.uk' }
          }
        },
        {
          name: 'telephoneNumberField',
          title: 'Telephone number field',
          payload: {
            empty: { telephoneNumberField: '' },
            valid: { telephoneNumberField: '+447900000000' }
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
            },
            valid: {
              addressField__addressLine1: 'Richard Fairclough House',
              addressField__addressLine2: 'Knutsford Road',
              addressField__town: 'Warrington',
              addressField__postcode: 'WA4 1HT'
            }
          }
        },
        {
          name: 'radiosField',
          title: 'Radios field',
          payload: {
            empty: {},
            valid: { radiosField: 'privateLimitedCompany' }
          }
        },
        {
          name: 'selectField',
          title: 'Select field',
          payload: {
            empty: { selectField: '' },
            valid: { selectField: '910400158' }
          }
        },
        {
          name: 'autocompleteField',
          title: 'Autocomplete field',
          payload: {
            empty: { autocompleteField: '' },
            valid: { autocompleteField: '910400184' }
          }
        },
        {
          name: 'checkboxesSingle',
          title: 'Checkboxes field 1',
          payload: {
            empty: {},
            valid: { checkboxesSingle: 'Arabian' }
          }
        },
        {
          name: 'checkboxesMultiple',
          title: 'Checkboxes field 2',
          payload: {
            empty: {},
            valid: { checkboxesMultiple: 'Patomine' }
          }
        },
        {
          name: 'checkboxesSingleNumber',
          title: 'Checkboxes field 3 (number)',
          payload: {
            empty: {},
            valid: { checkboxesSingleNumber: '0' }
          }
        },
        {
          name: 'checkboxesMultipleNumber',
          title: 'Checkboxes field 4 (number)',
          payload: {
            empty: {},
            valid: { checkboxesMultipleNumber: '1' }
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
      formFileName: 'fields-required.js',
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

        const $heading = within($errorSummary).getByRole('heading', {
          name: 'There is a problem',
          level: 2
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
