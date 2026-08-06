import { formMetadataSchema } from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { MetadataValidationError } from '~/src/server/services/errors.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/services/formsService.js'
import {
  buildBrokenConditionDefinition,
  buildSchemaInvalidDefinition
} from '~/test/fixtures/definitions.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/formsService.js')

const now = new Date()
const author = { id: 'test-author', displayName: 'Test author' }
const stateStamp = {
  createdAt: now,
  createdBy: author,
  updatedAt: now,
  updatedBy: author
}

const metadata = {
  ...fixtures.form.metadata,
  draft: stateStamp,
  live: stateStamp
}

const SLUG = fixtures.form.metadata.slug
const PREVIEW_URL = `${FORM_PREFIX}/preview/draft/${SLUG}`

describe('Server error pages', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(metadata)
  })

  describe('Public 500 page', () => {
    it('shows the generic error page with no diagnostics', async () => {
      jest
        .mocked(getFormDefinition)
        .mockResolvedValue(buildBrokenConditionDefinition())

      const { container, response } = await renderResponse(server, {
        method: 'GET',
        url: `${FORM_PREFIX}/${SLUG}`
      })

      expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const $heading = container.getByRole('heading', {
        name: 'Sorry, there is a problem with the service',
        level: 1
      })
      expect($heading).toBeInTheDocument()

      // the <title> lives in <head>, which renderResponse does not mount
      expect(response.result).toContain(
        '<title>Sorry, there is a problem with the service - '
      )

      expect(
        container.queryByRole('heading', { name: 'What went wrong' })
      ).not.toBeInTheDocument()
      expect(container.queryByText('Technical details')).not.toBeInTheDocument()
    })

    it('shows the generic error page for generic failures too', async () => {
      // e.g. a backend outage while fetching the definition
      jest
        .mocked(getFormDefinition)
        .mockRejectedValue(new Error('socket hang up'))

      const { container, response } = await renderResponse(server, {
        method: 'GET',
        url: `${FORM_PREFIX}/${SLUG}`
      })

      expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const $heading = container.getByRole('heading', {
        name: 'Sorry, there is a problem with the service',
        level: 1
      })
      expect($heading).toBeInTheDocument()

      expect(
        container.queryByRole('heading', {
          name: 'This form cannot be previewed'
        })
      ).not.toBeInTheDocument()
      expect(container.queryByText('Technical details')).not.toBeInTheDocument()
    })
  })

  describe('Preview 500 page', () => {
    it('shows a single cause as body text', async () => {
      jest
        .mocked(getFormDefinition)
        .mockResolvedValue(buildBrokenConditionDefinition())

      const { container, response } = await renderResponse(server, {
        method: 'GET',
        url: PREVIEW_URL
      })

      expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const $heading = container.getByRole('heading', {
        name: 'This form cannot be previewed',
        level: 1
      })
      expect($heading).toBeInTheDocument()

      // the <title> lives in <head>, which renderResponse does not mount
      expect(response.result).toContain(
        '<title>This form cannot be previewed - '
      )

      const $causesHeading = container.getByRole('heading', {
        name: 'What went wrong',
        level: 2
      })
      expect($causesHeading).toBeInTheDocument()

      const $cause = container.getByText(
        "The condition 'Existing user' is invalid. Check that it refers to the right question and answer option."
      )
      expect($cause).toBeInTheDocument()
      expect($cause.tagName).toBe('P')
    })

    it('shows multiple causes as a bulleted list', async () => {
      jest
        .mocked(getFormDefinition)
        .mockResolvedValue(buildSchemaInvalidDefinition())

      const { container, response } = await renderResponse(server, {
        method: 'GET',
        url: PREVIEW_URL
      })

      expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const causes = container
        .getAllByRole('listitem')
        .map(($item) => $item.textContent.trim())

      expect(causes).toEqual(
        expect.arrayContaining([
          'Each page must have a unique ID. Change the page ID to one that is not already used.',
          'Each page must have a unique path. Change the page path to one that is not already used.'
        ])
      )
    })

    it('reveals the technical detail for support', async () => {
      jest
        .mocked(getFormDefinition)
        .mockResolvedValue(buildBrokenConditionDefinition())

      const { container } = await renderResponse(server, {
        method: 'GET',
        url: PREVIEW_URL
      })

      const $reveal = container.getByText('Technical details')
      expect($reveal).toBeInTheDocument()
      expect($reveal.closest('details')).not.toBeNull()

      const $technical = container.getByText(
        /Failed to build condition 'Existing user'/
      )
      expect($technical.closest('details')).not.toBeNull()
    })

    it('shows the generic error page when the failure is not form configuration', async () => {
      // e.g. a backend outage while fetching the definition
      jest
        .mocked(getFormDefinition)
        .mockRejectedValue(new Error('socket hang up'))

      const { container, response } = await renderResponse(server, {
        method: 'GET',
        url: PREVIEW_URL
      })

      expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const $heading = container.getByRole('heading', {
        name: 'Sorry, there is a problem with the service',
        level: 1
      })
      expect($heading).toBeInTheDocument()

      expect(
        container.queryByRole('heading', {
          name: 'This form cannot be previewed'
        })
      ).not.toBeInTheDocument()
      expect(container.queryByText('Technical details')).not.toBeInTheDocument()
    })

    it('points the author at the form overview when metadata is invalid', async () => {
      const { error } = formMetadataSchema.validate(
        { ...fixtures.form.metadata, notificationEmail: 'not-an-email' },
        { abortEarly: false }
      )
      if (!error) throw new Error('expected metadata validation error')

      jest
        .mocked(getFormMetadata)
        .mockRejectedValue(new MetadataValidationError(error))

      const { container, response } = await renderResponse(server, {
        method: 'GET',
        url: PREVIEW_URL
      })

      expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const $cause = container.getByText(
        "Some of the form's details are invalid. Go back to the form overview and check details such as contact information and email addresses."
      )
      expect($cause).toBeInTheDocument()

      const $technical = container.getByText(
        /"notificationEmail" must be a valid email/
      )
      expect($technical.closest('details')).not.toBeNull()
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
