import {
  ComponentType,
  ControllerPath,
  ControllerType
} from '@defra/forms-model'

import { createServer } from '~/src/server/index.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/plugins/engine/services/formsService.js'
import { metadata } from '~/test/fixtures/form.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Plugin', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('route error-preview', () => {
    const itemId = '1491981d-99cd-485e-ab4a-f88275edeadc'

    /**
     * @satisfies {FormDefinition}
     */
    const definition = {
      name: '',
      startPage: '/page-one',
      pages: [
        {
          path: '/page-one',
          title: 'Page one',
          section: 'section',
          components: [
            {
              id: itemId,
              type: ComponentType.TextField,
              name: 'textField',
              title: 'This is your first field',
              hint: 'Help text',
              options: {},
              schema: {}
            }
          ],
          next: [{ path: ControllerPath.Summary }]
        },
        {
          title: 'Summary',
          path: ControllerPath.Summary,
          controller: ControllerType.Summary
        }
      ],
      sections: [
        {
          name: 'section',
          title: 'Section title',
          hideTitle: false
        }
      ],
      conditions: [],
      lists: [],
      outputEmail: 'enrique.chase@defra.gov.uk'
    }

    test('validates and calls handle if valid payload', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(metadata)
      const def = /** @type {FormDefinition} */ (structuredClone(definition))
      jest.mocked(getFormDefinition).mockResolvedValueOnce(def)
      const options = {
        method: 'GET',
        url: `/error-preview/draft/slug/page-one/${itemId}`
      }

      const { container } = await renderResponse(server, options)

      const $headings = container.getAllByRole('heading')
      const $links = container.getAllByRole('link')

      expect($headings[2].textContent?.trim()).toBe('There is a problem')
      expect($headings[2]).toHaveClass(
        'govuk-error-summary__title govuk-!-margin-bottom-2'
      )

      expect($links[5].textContent).toBe('Enter [short description]')

      expect($headings[3].textContent?.trim()).toBe('If you set answer limits')
      expect($headings[3]).toHaveClass(
        'govuk-error-summary__title govuk-!-margin-bottom-2'
      )

      expect($links[6].textContent).toBe(
        '[short description] must be [min length] characters or more'
      )
      expect($links[7].textContent).toBe(
        '[short description] must be [max length] characters or less'
      )
    })
  })
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 * @import { Server } from '@hapi/hapi'
 */
