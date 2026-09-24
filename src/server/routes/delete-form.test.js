import { FormStatus } from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'

import { config } from '~/src/config/index.js'
import { HOMEPAGE_PREFIX, PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  buildErrorList,
  getValidationErrorsFromSession
} from '~/src/server/helpers/error-helper.js'
import { createServer } from '~/src/server/index.js'
import { CONFIRM_DELETE_NAME } from '~/src/server/routes/delete-form.js'
import { getFormMetadataById } from '~/src/server/services/formsService.js'
import {
  deleteSavedFormState,
  getSavedFormState
} from '~/src/server/services/submissionService.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/formMetadataGuards.js')
jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/services/submissionService.js')
jest.mock('~/src/server/helpers/error-helper.js')
jest.mock('@defra/forms-engine-plugin/engine/form-availability.js')

describe('Delete form routes', () => {
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

  const FORM_ID = 'eab6ac6c-79b6-439f-bd94-d93eb121b3f1'
  const MAGIC_LINK_ID = 'fd4e6453-fb32-43e4-b4cf-12b381a713de'
  const credentials = {
    iss: 'http://localhost:3011',
    sub: 'sub-1',
    email: 'citizen@example.com',
    idToken: 'header.payload.signature',
    accessToken: 'access-1'
  }

  describe('GET /delete-form/{formId}/{magicLinkId}', () => {
    test('get route responds OK', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ id: FORM_ID, slug: 'my-form-to-delete' })
      jest.mocked(getSavedFormState).mockResolvedValueOnce({
        referenceNumber: 'XXX-XXX-XXX',
        state: { textField: 'value' },
        magicLinkGroupId: 'group-1',
        expireAt: '',
        form: {
          id: 'string',
          title: 'string',
          status: FormStatus.Draft,
          isPreview: true,
          baseUrl: 'http://'
        }
      })

      const options = {
        method: 'GET',
        url: `/delete-form/${FORM_ID}/${MAGIC_LINK_ID}`,
        auth: { strategy: 'citizen-session', credentials }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)
    })

    test('get route responds OK with validation errors', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ id: FORM_ID, slug: 'my-form-to-delete' })
      jest.mocked(getSavedFormState).mockResolvedValueOnce({
        referenceNumber: 'XXX-XXX-XXX',
        state: { textField: 'value' },
        magicLinkGroupId: 'group-1',
        expireAt: '',
        form: {
          id: 'string',
          title: 'string',
          status: FormStatus.Draft,
          isPreview: true,
          baseUrl: 'http://'
        }
      })
      jest.mocked(getValidationErrorsFromSession).mockReturnValueOnce({
        formErrors: {
          [CONFIRM_DELETE_NAME]: { text: 'Error message', href: '#error' }
        },
        formValues: {}
      })
      jest
        .mocked(buildErrorList)
        .mockReturnValueOnce([{ text: 'Error message', href: '#error' }])

      const options = {
        method: 'GET',
        url: `/delete-form/${FORM_ID}/${MAGIC_LINK_ID}`,
        auth: { strategy: 'citizen-session', credentials }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)
    })

    test('get route responds BadRequest if the save form has already been deleted', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ id: FORM_ID, slug: 'my-form-to-delete' })
      jest.mocked(getSavedFormState).mockResolvedValueOnce({
        referenceNumber: 'XXX-XXX-XXX',
        state: { textField: 'value' },
        magicLinkGroupId: 'group-1',
        expireAt: '',
        form: {
          id: 'string',
          title: 'string',
          status: FormStatus.Draft,
          isPreview: true,
          baseUrl: 'http://'
        },
        isDeleted: true
      })

      const options = {
        method: 'GET',
        url: `/delete-form/${FORM_ID}/${MAGIC_LINK_ID}`,
        auth: { strategy: 'citizen-session', credentials }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST /delete-form/{formId}/{magicLinkId}', () => {
    test('post route responds with 302 when "No" selected', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ id: FORM_ID, slug: 'my-form-to-delete' })
      jest.mocked(getSavedFormState).mockResolvedValueOnce({
        referenceNumber: 'XXX-XXX-XXX',
        state: { textField: 'value' },
        magicLinkGroupId: 'group-1',
        expireAt: '',
        form: {
          id: 'string',
          title: 'string',
          status: FormStatus.Draft,
          isPreview: true,
          baseUrl: 'http://'
        }
      })
      jest
        .mocked(deleteSavedFormState)
        .mockResolvedValueOnce({ modified: true, matched: true })

      const options = {
        method: 'POST',
        url: `/delete-form/${FORM_ID}/${MAGIC_LINK_ID}`,
        auth: { strategy: 'citizen-session', credentials },
        payload: {
          [CONFIRM_DELETE_NAME]: 'true'
        }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `${HOMEPAGE_PREFIX}${PREVIEW_PATH_PREFIX}/draft/my-form-to-delete`
      )
    })

    test('post route responds with 302 when "Yes" selected', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ id: FORM_ID, slug: 'my-form-to-delete' })
      jest.mocked(getSavedFormState).mockResolvedValueOnce({
        referenceNumber: 'XXX-XXX-XXX',
        state: { textField: 'value' },
        magicLinkGroupId: 'group-1',
        expireAt: '',
        form: {
          id: 'string',
          title: 'string',
          status: FormStatus.Draft,
          isPreview: true,
          baseUrl: 'http://'
        }
      })
      jest
        .mocked(deleteSavedFormState)
        .mockResolvedValueOnce({ modified: true, matched: true })

      const options = {
        method: 'POST',
        url: `/delete-form/${FORM_ID}/${MAGIC_LINK_ID}`,
        auth: { strategy: 'citizen-session', credentials },
        payload: {
          [CONFIRM_DELETE_NAME]: 'false'
        }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `${HOMEPAGE_PREFIX}${PREVIEW_PATH_PREFIX}/draft/my-form-to-delete`
      )
    })

    test('post route responds with 303 when nothing is selected', async () => {
      const options = {
        method: 'POST',
        url: `/delete-form/${FORM_ID}/${MAGIC_LINK_ID}`,
        auth: { strategy: 'citizen-session', credentials },
        payload: {}
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe(
        `/delete-form/${FORM_ID}/${MAGIC_LINK_ID}`
      )
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
