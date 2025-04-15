import { createServer } from '~/src/server/index.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/plugins/engine/services/formsService.js'
import {
  componentId,
  definitionWithComponentId,
  metadata
} from '~/test/fixtures/form.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Error preview route', () => {
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
    test('validates and calls handle if valid payload', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(metadata)
      const def = /** @type {FormDefinition} */ (
        structuredClone(definitionWithComponentId)
      )
      jest.mocked(getFormDefinition).mockResolvedValueOnce(def)
      const options = {
        method: 'GET',
        url: `/error-preview/draft/slug/page-one/${componentId}`
      }

      const { container } = await renderResponse(server, options)

      const $headings = container.getAllByRole('heading')
      const $links = container.getAllByRole('link')

      expect($headings[2].textContent?.trim()).toBe('There is a problem')
      expect($headings[2]).toHaveClass(
        'govuk-error-summary__title govuk-!-margin-bottom-2'
      )

      expect($links[4].textContent).toBe('Enter [short description]')

      expect($headings[3].textContent?.trim()).toBe('If you set answer limits')
      expect($headings[3]).toHaveClass(
        'govuk-error-summary__title govuk-!-margin-bottom-2'
      )

      expect($links[5].textContent).toBe(
        '[short description] must be [min length] characters or more'
      )
      expect($links[6].textContent).toBe(
        '[short description] must be [max length] characters or less'
      )
    })

    test('should error if definition not found', async () => {
      jest.mocked(getFormMetadata).mockResolvedValueOnce(metadata)
      jest.mocked(getFormDefinition).mockResolvedValueOnce(undefined)
      const options = {
        method: 'GET',
        url: `/error-preview/draft/slug/page-one/${componentId}`
      }

      const { container } = await renderResponse(server, options)

      const $headings = container.getAllByRole('heading')

      expect($headings[0].textContent).toBe('Page not found')
    })
  })
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 * @import { Server } from '@hapi/hapi'
 */
