import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/services/formsService.js'
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

const brokenConditionDef = {
  name: 'Broken condition fixture',
  engine: 'V2',
  schema: 2,
  startPage: '/summary',
  pages: [
    {
      id: '449c053b-9201-4312-9a75-187afc6ba48b',
      path: '/licence',
      title: 'Licence',
      components: [
        {
          id: 'a7c0242f-2a31-45b2-8c71-ff2ac7f53288',
          name: 'xVrYaJ',
          type: 'YesNoField',
          title: 'Do you have a licence?',
          shortDescription: 'Licence',
          options: { required: true },
          schema: {},
          list: '4fa26e9c-07cf-47cd-a9dd-5cec0dd3f544'
        }
      ],
      next: []
    },
    {
      id: '449c053b-9201-4312-9a75-187afc6ba48c',
      path: '/summary',
      title: 'Summary',
      controller: 'SummaryPageController',
      components: [],
      next: []
    }
  ],
  lists: [
    {
      id: '4fa26e9c-07cf-47cd-a9dd-5cec0dd3f544',
      name: 'XtfRYR',
      title: 'User type list',
      type: 'string',
      items: [
        {
          id: '55fe0067-d011-4d33-886c-e1aa266637c3',
          text: 'existing user',
          value: 'existing user'
        },
        {
          id: '2277c7e5-7fef-46c6-993b-d294116d6d6b',
          text: 'new user',
          value: 'new user'
        }
      ]
    }
  ],
  sections: [],
  conditions: [
    {
      id: '3f9d3a35-6dee-4706-806c-3f776129f631',
      displayName: 'Existing user',
      items: [
        {
          id: '7d7f58ee-c860-4d24-8a13-de5cb9af53d8',
          componentId: 'a7c0242f-2a31-45b2-8c71-ff2ac7f53288',
          operator: 'is',
          type: 'ListItemRef',
          value: {
            listId: '4fa26e9c-07cf-47cd-a9dd-5cec0dd3f544',
            itemId: ['55fe0067-d011-4d33-886c-e1aa266637c3']
          }
        }
      ]
    }
  ]
}

const unknownControllerDef = structuredClone(brokenConditionDef)
unknownControllerDef.name = 'Unknown controller fixture'
unknownControllerDef.conditions = []
delete unknownControllerDef.pages[0].components[0].list
unknownControllerDef.pages[0].controller = 'NoSuchPageController'

const schemaInvalidDef = structuredClone(brokenConditionDef)
schemaInvalidDef.name = 'Schema invalid fixture'
// pages must be unique by path — duplicate to force a Joi validation error
schemaInvalidDef.pages.push(structuredClone(schemaInvalidDef.pages[0]))

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
      brokenConditionDef,
      'The condition &#39;Existing user&#39; could not be understood'
    ],
    ['unknown page controller', unknownControllerDef, 'NoSuchPageController'],
    ['schema-invalid definition', schemaInvalidDef, 'Technical details']
  ])(
    'preview URL renders details for a %s',
    async (_label, definition, expectedText) => {
      jest.mocked(getFormDefinition).mockResolvedValue(definition)

      const res = await server.inject({ method: 'GET', url: PREVIEW_URL })

      expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      expect(res.payload).toContain('govuk-details')
      expect(res.payload).toContain('What went wrong (preview only)')
      expect(res.payload).toContain(expectedText)
    }
  )

  test('public URL renders the 500 page without details', async () => {
    jest.mocked(getFormDefinition).mockResolvedValue(brokenConditionDef)

    const res = await server.inject({
      method: 'GET',
      url: `${FORM_PREFIX}/${SLUG}`
    })

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(res.payload).not.toContain('govuk-details')
    expect(res.payload).not.toContain('What went wrong (preview only)')
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
    expect(res.payload).not.toContain('What went wrong (preview only)')
  })
})
