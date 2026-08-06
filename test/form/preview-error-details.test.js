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
  buildSchemaInvalidDefinition,
  buildUnknownComponentDefinition,
  buildUnknownControllerDefinition
} from '~/test/fixtures/definitions.js'
import * as fixtures from '~/test/fixtures/index.js'

jest.mock('~/src/server/services/formsService.js')

const now = new Date()
const author = { id: 'test-author', displayName: 'Test author' }
const stateStamp = {
  createdAt: now,
  createdBy: author,
  updatedAt: now,
  updatedBy: author
}

// Metadata with both states so live and preview URLs resolve
const metadata = {
  ...fixtures.form.metadata,
  draft: stateStamp,
  live: stateStamp
}

const SLUG = fixtures.form.metadata.slug
const PREVIEW_URL = `${FORM_PREFIX}/preview/draft/${SLUG}`

describe('preview error details (drift canary)', () => {
  /** @type {import('@hapi/hapi').Server} */
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

  test.each([
    [
      'broken condition',
      buildBrokenConditionDefinition(),
      'The condition &#39;Existing user&#39; is invalid'
    ],
    [
      'unknown page controller',
      buildUnknownControllerDefinition(),
      'uses a page type this version of the service does not recognise'
    ],
    [
      'unknown component type',
      buildUnknownComponentDefinition(),
      'uses a question type (&#39;MyUnknownField&#39;) this version of the service does not recognise'
    ],
    [
      'schema-invalid definition',
      buildSchemaInvalidDefinition(),
      'Each page must have a unique'
    ]
  ])(
    'preview URL renders details for a %s',
    async (_label, definition, expectedText) => {
      jest
        .mocked(getFormDefinition)
        .mockResolvedValue(
          /** @type {FormDefinition} */ (/** @type {unknown} */ (definition))
        )

      const res = await server.inject({ method: 'GET', url: PREVIEW_URL })

      expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      expect(res.payload).toContain('govuk-details')
      expect(res.payload).toContain('What went wrong')
      expect(res.payload).toContain(expectedText)
    }
  )

  test.each([
    [
      'an invalid notification email',
      {
        ...fixtures.form.metadata,
        notificationEmail: 'wildlife@naturalengland'
      },
      '&quot;notificationEmail&quot; must be a valid email'
    ],
    [
      'an invalid contact structure',
      { ...fixtures.form.metadata, contact: { phone: 12345 } },
      '&quot;contact.phone&quot; must be a string'
    ]
  ])(
    'preview URL renders metadata causes for %s',
    async (_label, badMetadata, expectedTechnicalText) => {
      const { error } = formMetadataSchema.validate(badMetadata, {
        abortEarly: false
      })
      if (!error) throw new Error('expected metadata validation error')

      // formsService throws the raw Joi error when the manager response
      // fails metadata validation
      jest
        .mocked(getFormMetadata)
        .mockRejectedValue(new MetadataValidationError(error))

      const res = await server.inject({ method: 'GET', url: PREVIEW_URL })

      expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      expect(res.payload).toContain('What went wrong')
      expect(res.payload).toContain(
        'Go back to the form overview and check details'
      )
      // the field-level detail still appears in the technical block
      expect(res.payload).toContain(expectedTechnicalText)
      // metadata failures must not claim the form definition is broken
      expect(res.payload).not.toContain('form definition')
    }
  )

  test('public URL renders the 500 page without details', async () => {
    jest
      .mocked(getFormDefinition)
      .mockResolvedValue(
        /** @type {FormDefinition} */ (
          /** @type {unknown} */ (buildBrokenConditionDefinition())
        )
      )

    const res = await server.inject({
      method: 'GET',
      url: `${FORM_PREFIX}/${SLUG}`
    })

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(res.payload).not.toContain('govuk-details')
    expect(res.payload).not.toContain('What went wrong')
  })

  test('404 pages are unaffected', async () => {
    const Boom = await import('@hapi/boom')
    jest
      .mocked(getFormMetadata)
      .mockRejectedValue(Boom.default.notFound('Form not found'))

    const res = await server.inject({
      method: 'GET',
      url: `${FORM_PREFIX}/preview/draft/no-such-form-here`
    })

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
    expect(res.payload).not.toContain('What went wrong')
  })
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
