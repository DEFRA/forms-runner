import {
  ComponentType,
  ControllerPath,
  ControllerType,
  FormStatus
} from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'

import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
import {
  getFormDefinition,
  getFormMetadataById
} from '~/src/server/services/formsService.js'
import { getSubmissionRecord } from '~/src/server/services/submissionService.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/services/submissionService.js')

const FORM_ID = 'eab6ac6c-79b6-439f-bd94-d93eb121b3f1'
const REFERENCE_NUMBER = 'ABC-123-XYZ'
const credentials = {
  iss: 'http://localhost:3011',
  sub: 'sub-1',
  email: 'citizen@example.com',
  idToken: 'header.payload.signature',
  accessToken: 'access-1',
  accessTokenExpiresAt: 1,
  refreshToken: 'refresh-old'
}

function buildFormDefinition({
  versionNumber = 1,
  hasDeclaration = false
} = {}) {
  return {
    name: '',
    startPage: '/page-one',
    pages: [
      {
        path: '/page-one',
        title: 'Page one',
        section: 'section',
        components: [
          ...(hasDeclaration
            ? [
                {
                  type: ComponentType.DeclarationField,
                  name: 'declaration',
                  title: 'Declaration',
                  options: {},
                  schema: {}
                }
              ]
            : [
                {
                  type: ComponentType.TextField,
                  name: 'textField',
                  title: 'This is your first field',
                  hint: 'Help text',
                  options: {},
                  schema: {}
                }
              ])
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
    metadata: {
      $$__formVersion: {
        versionNumber
      }
    }
  }
}

function buildSubmission({
  status = FormStatus.Draft,
  versionNumber = 1,
  isPreview = false
} = {}) {
  return {
    id: 'submission-1',
    data: {
      main: {},
      repeaters: {}
    },
    meta: {
      referenceNumber: REFERENCE_NUMBER,
      status,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      isPreview,
      versionMetadata: {
        versionNumber
      }
    }
  }
}

describe('Copy form routes', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    config.set('useSignInFeature', true)

    server = await createServer({
      enforceCsrf: false
    })
    await server.initialize()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /confirm-copy-form/{formId}/{referenceNumber}', () => {
    test('responds with OK', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ id: FORM_ID, slug: 'my-form' })
      // @ts-expect-error - allow partial objects for tests
      jest.mocked(getSubmissionRecord).mockResolvedValueOnce(buildSubmission())

      const options = {
        method: 'GET',
        url: `/confirm-copy-form/${FORM_ID}/${REFERENCE_NUMBER}`,
        auth: { strategy: 'citizen-session', credentials }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)
    })
  })

  describe('POST /confirm-copy-form/{formId}/{referenceNumber}', () => {
    test('redirects to the changed form page when the form has a declaration', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ id: FORM_ID, slug: 'my-form' })
      // @ts-expect-error - allow partial objects for tests
      jest.mocked(getSubmissionRecord).mockResolvedValueOnce(buildSubmission())

      jest.mocked(getFormDefinition).mockResolvedValueOnce(
        // @ts-expect-error - allow partial objects for tests
        buildFormDefinition({ versionNumber: 1, hasDeclaration: true })
      )

      const options = {
        method: 'POST',
        url: `/confirm-copy-form/${FORM_ID}/${REFERENCE_NUMBER}`,
        auth: { strategy: 'citizen-session', credentials },
        payload: { confirmCopy: true }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `/confirm-copy-form/${FORM_ID}/${REFERENCE_NUMBER}/form-changed`
      )
    })

    test('redirects to the summary when the copied form version matches', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ id: FORM_ID, slug: 'my-form' })
      // @ts-expect-error - allow partial objects for tests
      jest.mocked(getSubmissionRecord).mockResolvedValueOnce(buildSubmission())

      jest.mocked(getFormDefinition).mockResolvedValueOnce(
        // @ts-expect-error - allow partial objects for tests
        buildFormDefinition({ versionNumber: 1, hasDeclaration: false })
      )

      const options = {
        method: 'POST',
        url: `/confirm-copy-form/${FORM_ID}/${REFERENCE_NUMBER}`,
        auth: { strategy: 'citizen-session', credentials },
        payload: { confirmCopy: true }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/form/my-form/summary')
    })
  })

  describe('GET /confirm-copy-form/{formId}/{referenceNumber}/form-changed', () => {
    test('responds with OK', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ id: FORM_ID, slug: 'my-form' })
      // @ts-expect-error - allow partial objects for tests
      jest.mocked(getSubmissionRecord).mockResolvedValueOnce(buildSubmission())

      const options = {
        method: 'GET',
        url: `/confirm-copy-form/${FORM_ID}/${REFERENCE_NUMBER}/form-changed`,
        auth: { strategy: 'citizen-session', credentials }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)
    })
  })

  describe('POST /confirm-copy-form/{formId}/{referenceNumber}/form-changed', () => {
    test('redirects to the form when the form version has changed', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ id: FORM_ID, slug: 'my-form' })
      jest.mocked(getSubmissionRecord).mockResolvedValueOnce(
        // @ts-expect-error - allow partial objects for tests
        buildSubmission({ versionNumber: 1 })
      )

      jest.mocked(getFormDefinition).mockResolvedValueOnce(
        // @ts-expect-error - allow partial objects for tests
        buildFormDefinition({ versionNumber: 2, hasDeclaration: false })
      )

      const options = {
        method: 'POST',
        url: `/confirm-copy-form/${FORM_ID}/${REFERENCE_NUMBER}/form-changed`,
        auth: { strategy: 'citizen-session', credentials },
        payload: { confirmCopy: true }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/form/my-form')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
