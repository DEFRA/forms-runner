import { FormStatus } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { createJoiError } from '~/src/server/helpers/error-helper.js'
import { createServer } from '~/src/server/index.js'
import { addError } from '~/src/server/routes/save-and-exit.js'
import {
  getFormMetadata,
  getFormMetadataById,
  isOfflineBoom
} from '~/src/server/services/formMetadataGuards.js'
import {
  getSaveAndExitDetails,
  validateSaveAndExitCredentials
} from '~/src/server/services/formsService.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/formMetadataGuards.js')
jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/helpers/error-helper.js')

describe('Save-and-exit check routes', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer({
      enforceCsrf: false
    })
    await server.initialize()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(logger, 'error').mockImplementation(() => {
      /* mock */
    })
    jest.spyOn(logger, 'info').mockImplementation(() => {
      /* mock */
    })
  })

  const FORM_ID = 'eab6ac6c-79b6-439f-bd94-d93eb121b3f1'
  const MAGIC_LINK_ID = 'fd4e6453-fb32-43e4-b4cf-12b381a713de'

  describe('GET /resume-form/{formId}/{magicLinkId}', () => {
    test('route forwards correctly on success', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ slug: 'my-form-to-resume' })
      jest.mocked(getSaveAndExitDetails).mockResolvedValueOnce({
        // @ts-expect-error - allow partial objects for tests
        form: {
          isPreview: true,
          status: FormStatus.Draft
        }
      })

      const options = {
        method: 'GET',
        url: `/resume-form/${FORM_ID}/${MAGIC_LINK_ID}`
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume/draft`
      )
    })

    test('route forwards correctly on invalid form error', async () => {
      jest.mocked(getFormMetadataById).mockImplementationOnce(() => {
        throw new Error('form not found')
      })
      jest.mocked(getSaveAndExitDetails).mockResolvedValueOnce({
        // @ts-expect-error - allow partial objects for tests
        form: {
          isPreview: true,
          status: FormStatus.Draft
        }
      })

      const options = {
        method: 'GET',
        url: `/resume-form/${FORM_ID}/${MAGIC_LINK_ID}`
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe('/resume-form-error')
    })

    test('route forwards correctly on magic link error', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ slug: 'my-form-to-resume' })
      jest.mocked(getSaveAndExitDetails).mockImplementationOnce(() => {
        throw new Error('magic link not found')
      })

      const options = {
        method: 'GET',
        url: `/resume-form/${FORM_ID}/${MAGIC_LINK_ID}`
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe(
        '/resume-form-error/my-form-to-resume'
      )
    })

    test('route forwards correctly on magic link consumed but redirects to latest link', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ slug: 'my-form-to-resume' })
      jest.mocked(getSaveAndExitDetails).mockImplementationOnce(() => {
        const boomError = Boom.resourceGone('magic link consumed')
        boomError.data = {
          payload: {
            latestId: 'latest-link-id'
          }
        }
        throw boomError
      })

      const options = {
        method: 'GET',
        url: `/resume-form/${FORM_ID}/${MAGIC_LINK_ID}`
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe(
        '/resume-form/eab6ac6c-79b6-439f-bd94-d93eb121b3f1/latest-link-id'
      )
    })

    test('throws if trying to redirect to latest in group, but none found', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ slug: 'my-form-to-resume' })
      jest.mocked(getSaveAndExitDetails).mockImplementationOnce(() => {
        const boomError = Boom.resourceGone('magic link consumed')
        boomError.output.payload.custom = {
          latestId: undefined
        }
        throw boomError
      })

      const options = {
        method: 'GET',
        url: `/resume-form/${FORM_ID}/${MAGIC_LINK_ID}`
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe(
        '/resume-form-error/my-form-to-resume'
      )
    })

    test('route forwards correctly on magic link error - wrong form id', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ slug: 'my-form-to-resume' })
      jest
        .mocked(getSaveAndExitDetails)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ form: { id: 'wrong-form' } })

      const options = {
        method: 'GET',
        url: `/resume-form/${FORM_ID}/${MAGIC_LINK_ID}`
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe(
        '/resume-form-error/my-form-to-resume'
      )
    })

    test('route forwards correctly on magic link error 2', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ slug: 'my-form-to-resume' })
      jest.mocked(getSaveAndExitDetails).mockResolvedValueOnce(undefined)

      const options = {
        method: 'GET',
        url: `/resume-form/${FORM_ID}/${MAGIC_LINK_ID}`
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe(
        '/resume-form-error/my-form-to-resume'
      )
    })

    test('throws if form is offline', async () => {
      const offlineErr = Boom.boomify(new Error('offline'), {
        statusCode: 503,
        data: { offline: true }
      })
      jest.mocked(getFormMetadataById).mockRejectedValueOnce(offlineErr)
      jest.mocked(isOfflineBoom).mockReturnValueOnce(true)

      const options = {
        method: 'GET',
        url: `/resume-form/${FORM_ID}/${MAGIC_LINK_ID}`
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(StatusCodes.SERVICE_UNAVAILABLE)
    })

    test('logs error and redirects on other metadata fetch error', async () => {
      const otherErr = new Error('fetch failed')
      jest.mocked(getFormMetadataById).mockRejectedValueOnce(otherErr)
      jest.mocked(isOfflineBoom).mockReturnValueOnce(false)

      const options = {
        method: 'GET',
        url: `/resume-form/${FORM_ID}/${MAGIC_LINK_ID}`
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe('/resume-form-error')
      expect(logger.error).toHaveBeenCalledWith(
        otherErr,
        `Invalid formId ${FORM_ID} in magic link id ${MAGIC_LINK_ID}`
      )
    })
  })

  describe('GET /resume-form-verify/{formId}/{magicLinkId}/{slug}/state?}', () => {
    test('route renders page', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({
          slug: 'my-form-to-resume',
          title: 'My Form To Resume'
        })
      jest.mocked(getSaveAndExitDetails).mockResolvedValueOnce({
        // @ts-expect-error - allow partial objects for tests
        form: {
          isPreview: true,
          status: FormStatus.Draft
        }
      })

      const options = {
        method: 'GET',
        url: `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume/draft`
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)

      const $mastheadHeading = container.getByText('Continue with your form')
      expect($mastheadHeading).toBeInTheDocument()
    })

    test('route forwards correctly on invalid form error', async () => {
      jest.mocked(getFormMetadataById).mockImplementationOnce(() => {
        throw new Error('form not found')
      })
      jest.mocked(getSaveAndExitDetails).mockResolvedValueOnce({
        // @ts-expect-error - allow partial objects for tests
        form: {
          isPreview: true,
          status: FormStatus.Draft
        }
      })

      const options = {
        method: 'GET',
        url: `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume/draft`
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/resume-form-error')
    })

    test('route forwards correctly on magic link error', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({ slug: 'my-form-to-resume' })
      // @ts-expect-error - allow partial objects for tests
      jest.mocked(getSaveAndExitDetails).mockImplementationOnce(undefined)

      const options = {
        method: 'GET',
        url: `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume/draft`
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/resume-form-error')
    })

    test('throws if form is offline', async () => {
      const offlineErr = Boom.boomify(new Error('offline'), {
        statusCode: 503,
        data: { offline: true }
      })
      jest.mocked(getFormMetadataById).mockRejectedValueOnce(offlineErr)
      jest.mocked(isOfflineBoom).mockReturnValueOnce(true)

      const options = {
        method: 'GET',
        url: `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume/draft`
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(StatusCodes.SERVICE_UNAVAILABLE)
    })

    test('logs error and redirects on other metadata fetch error', async () => {
      const otherErr = new Error('fetch failed')
      jest.mocked(getFormMetadataById).mockRejectedValueOnce(otherErr)
      jest.mocked(isOfflineBoom).mockReturnValueOnce(false)

      const options = {
        method: 'GET',
        url: `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume/draft`
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/resume-form-error')
      expect(logger.error).toHaveBeenCalledWith(
        otherErr,
        `Invalid formId ${FORM_ID} in magic link id ${MAGIC_LINK_ID}`
      )
    })
  })

  describe('GET /resume-form-error', () => {
    test('route renders page without slug', async () => {
      const options = {
        method: 'GET',
        url: '/resume-form-error'
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)

      const $mastheadHeading = container.getByText(
        'You cannot resume your form'
      )

      const $button = container.queryByRole('button', {
        name: 'Start form again'
      })

      expect($mastheadHeading).toBeInTheDocument()
      expect($button).not.toBeInTheDocument()
    })

    test('route renders page with slug', async () => {
      const options = {
        method: 'GET',
        url: '/resume-form-error/my-slug'
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)

      const $mastheadHeading = container.getByText(
        'You cannot resume your form'
      )

      const $button = container.queryByRole('button', {
        name: 'Start form again'
      })

      expect($mastheadHeading).toBeInTheDocument()
      expect($button).toBeInTheDocument()
      expect($button).toHaveAttribute('href', '/form/my-slug')
    })

    test('throws if form is offline', async () => {
      const offlineErr = Boom.boomify(new Error('offline'), {
        statusCode: 503,
        data: { offline: true }
      })
      jest.mocked(getFormMetadata).mockRejectedValueOnce(offlineErr)
      jest.mocked(isOfflineBoom).mockReturnValueOnce(true)

      const options = {
        method: 'GET',
        url: '/resume-form-error/my-slug'
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(StatusCodes.SERVICE_UNAVAILABLE)
    })

    test('logs info on other metadata fetch error', async () => {
      const otherErr = new Error('fetch failed')
      jest.mocked(getFormMetadata).mockRejectedValueOnce(otherErr)
      jest.mocked(isOfflineBoom).mockReturnValueOnce(false)

      const options = {
        method: 'GET',
        url: '/resume-form-error/my-slug'
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(logger.info).toHaveBeenCalledWith(
        { err: otherErr },
        'Could not load metadata for resume-form-error slug my-slug; rendering generic error view'
      )
    })
  })

  describe('GET /resume-form-success', () => {
    test('route renders page without state', async () => {
      jest
        .mocked(getFormMetadata)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({
          slug: 'my-form-to-resume',
          title: 'My Form To Resume'
        })

      const options = {
        method: 'GET',
        url: '/resume-form-success/my-slug'
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)

      const $mastheadHeading = container.getByText('Welcome back to your form')

      const $button = container.queryByRole('button', {
        name: 'Resume form'
      })

      expect($mastheadHeading).toBeInTheDocument()
      expect($button).toBeInTheDocument()
      expect($button).toHaveAttribute('href', '/form/my-form-to-resume/summary')
    })

    test('route renders page with slug', async () => {
      jest
        .mocked(getFormMetadata)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({
          slug: 'my-form-to-resume',
          title: 'My Form To Resume'
        })

      const options = {
        method: 'GET',
        url: '/resume-form-success/my-slug/draft'
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)

      const $mastheadHeading = container.getByText('Welcome back to your form')

      const $button = container.queryByRole('button', {
        name: 'Resume form'
      })

      expect($mastheadHeading).toBeInTheDocument()
      expect($button).toBeInTheDocument()
      expect($button).toHaveAttribute(
        'href',
        '/form/preview/draft/my-form-to-resume/summary'
      )
    })
  })

  describe('/resume-form-verify/{formId}/{magicLinkId}/{slug}/{state?}', () => {
    test('route handles invalid password', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({
          slug: 'my-form-to-resume',
          title: 'My Form To Resume'
        })
      jest.mocked(validateSaveAndExitCredentials).mockResolvedValueOnce({
        validPassword: false,
        invalidPasswordAttempts: 1,
        // @ts-expect-error - allow partial objects for tests
        form: {
          id: FORM_ID
        }
      })

      const options = {
        method: 'POST',
        url: `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume`,
        payload: {
          securityAnswer: 'invalid'
        }
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)

      const $mastheadHeading = container.getByText('Continue with your form')
      expect($mastheadHeading).toBeInTheDocument()
      expect(createJoiError).toHaveBeenCalledWith(
        'securityAnswer',
        'Your answer is incorrect. You have 4 attempts remaining.'
      )
    })

    test('route handles lockout', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({
          slug: 'my-form-to-resume',
          title: 'My Form To Resume'
        })
      jest.mocked(validateSaveAndExitCredentials).mockResolvedValueOnce({
        validPassword: false,
        invalidPasswordAttempts: 5,
        // @ts-expect-error - allow partial objects for tests
        form: {
          id: FORM_ID
        }
      })

      const options = {
        method: 'POST',
        url: `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume`,
        payload: {
          securityAnswer: 'invalid'
        }
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)

      const $mastheadHeading = container.getByText(
        'You cannot resume your form'
      )
      expect($mastheadHeading).toBeInTheDocument()
      const $errorMessage = container.getByText(
        'The answer to your security question was incorrect 5 times. You have run out of attempts to resume your form.'
      )
      expect($errorMessage).toBeInTheDocument()
    })

    test('route handles missing password', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({
          slug: 'my-form-to-resume',
          title: 'My Form To Resume'
        })
      jest.mocked(validateSaveAndExitCredentials).mockResolvedValueOnce({
        validPassword: false,
        invalidPasswordAttempts: 1,
        // @ts-expect-error - allow partial objects for tests
        form: {
          id: FORM_ID
        }
      })
      jest.mocked(getSaveAndExitDetails).mockResolvedValueOnce({
        // @ts-expect-error - allow partial objects for tests
        form: {
          isPreview: true,
          status: FormStatus.Draft
        }
      })

      const options = {
        method: 'POST',
        url: `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume`,
        payload: {
          securityAnswer: ''
        }
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)

      const $mastheadHeading = container.getByText('Continue with your form')
      expect($mastheadHeading).toBeInTheDocument()
      expect(createJoiError).not.toHaveBeenCalled()
    })

    test('route handles missing password and invalid url', async () => {
      jest
        .mocked(getFormMetadataById)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce({
          slug: 'my-form-to-resume',
          title: 'My Form To Resume'
        })
      jest.mocked(validateSaveAndExitCredentials).mockResolvedValueOnce({
        validPassword: false,
        invalidPasswordAttempts: 1,
        // @ts-expect-error - allow partial objects for tests
        form: {
          id: FORM_ID
        }
      })
      jest.mocked(getSaveAndExitDetails).mockResolvedValueOnce(undefined)

      const options = {
        method: 'POST',
        url: `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume`,
        payload: {
          securityAnswer: ''
        }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/resume-form-error')
    })

    test('throws if form is offline', async () => {
      const offlineErr = Boom.boomify(new Error('offline'), {
        statusCode: 503,
        data: { offline: true }
      })
      jest.mocked(getFormMetadataById).mockRejectedValueOnce(offlineErr)
      jest.mocked(isOfflineBoom).mockReturnValueOnce(true)

      const options = {
        method: 'POST',
        url: `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume`,
        payload: { securityAnswer: 'any' }
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(StatusCodes.SERVICE_UNAVAILABLE)
    })

    test('logs error and redirects on other metadata fetch error', async () => {
      const otherErr = new Error('fetch failed')
      jest.mocked(getFormMetadataById).mockRejectedValueOnce(otherErr)
      jest.mocked(isOfflineBoom).mockReturnValueOnce(false)

      const options = {
        method: 'POST',
        url: `/resume-form-verify/${FORM_ID}/${MAGIC_LINK_ID}/my-form-to-resume`,
        payload: { securityAnswer: 'any' }
      }

      const { response } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/resume-form-error')
      expect(logger.error).toHaveBeenCalledWith(
        otherErr,
        `Invalid formId ${FORM_ID} in magic link id ${MAGIC_LINK_ID}`
      )
    })
  })

  describe('addError', () => {
    test('adds error to existing array', () => {
      const model = { errors: [{ href: '#', text: 'Some error text1' }] }
      const error = { href: '#', text: 'Some error text2' }
      const newModel = addError(model, error)
      expect(newModel.errors).toHaveLength(2)
    })

    test('adds error to new error array', () => {
      const model = {}
      const error = { href: '#', text: 'Some error text' }
      const newModel = addError(model, error)
      expect(newModel.errors).toHaveLength(1)
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
