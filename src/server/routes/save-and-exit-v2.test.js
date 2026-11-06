import {
  checkFormStatus,
  getCacheService
} from '@defra/forms-engine-plugin/engine/helpers.js'
import { FormStatus } from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { createServer } from '~/src/server/index.js'
import { publishSaveAndExitV2Event } from '~/src/server/messaging/publish.js'
import { getFormMetadataWithGuard } from '~/src/server/services/formMetadataGuards.js'
import { getFormDefinitionWithFallback } from '~/src/server/services/helpers/formsServiceHelper.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { citizenSession } from '~/test/utils/citizen-session.js'

jest.mock('~/src/server/services/formMetadataGuards.js')
jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/services/helpers/formsServiceHelper.js')
jest.mock('~/src/server/helpers/error-helper.js')
jest.mock('@defra/forms-engine-plugin/engine/form-availability.js')
jest.mock('@defra/forms-engine-plugin/engine/helpers.js')
jest.mock('~/src/server/messaging/publish.js')

// Enable sign-in routes while retaining the real values for every other setting.
jest.mock('~/src/config/index', () => {
  const actual = jest.requireActual('~/src/config/index')

  actual.config.set('useSignInFeature', true)

  return actual
})

const DRAFT_STATE = 'draft'

/** A citizen who has signed in, as the citizen-session scheme presents them */
const credentials = {
  iss: 'http://localhost:3011',
  sub: 'sub-1',
  email: 'citizen@example.com',
  accessToken: 'access-1',
  accessTokenExpiresAt: Date.now() + 300_000,
  refreshToken: 'refresh-1',
  idToken: 'id-1'
}

const identity = {
  iss: credentials.iss,
  sub: credentials.sub,
  email: credentials.email
}

const tokens = {
  accessToken: credentials.accessToken,
  accessTokenExpiresAt: credentials.accessTokenExpiresAt,
  refreshToken: credentials.refreshToken,
  idToken: credentials.idToken
}

describe('Save-and-exit check routes', () => {
  /** @type {Server} */
  let server

  /** @type {ReturnType<typeof citizenSession>} */
  let session

  beforeAll(async () => {
    server = await createServer({
      enforceCsrf: false
    })
    session = citizenSession(server)

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(logger, 'error').mockImplementation(() => {
      /* mock */
    })
    jest.spyOn(logger, 'info').mockImplementation(() => {
      /* mock */
    })
    // @ts-expect-error - not all method mocked
    jest.mocked(getCacheService).mockImplementation(() => ({
      getState: jest.fn().mockResolvedValue({ key: 'val' }),
      setState: jest.fn(),
      clearState: jest.fn()
    }))
    jest
      .mocked(checkFormStatus)
      .mockReturnValue({ isPreview: true, state: FormStatus.Draft })
  })

  const FORM_SLUG = 'my-form-slug'

  const testMetadata = {
    slug: FORM_SLUG,
    id: '9a48c529-16eb-4ff7-98be-e8aec801b4ed',
    title: 'My test form'
  }

  describe('GET /save-and-exit/{slug}/{state?}', () => {
    it('shows a signed-out citizen the sign-in page', async () => {
      jest
        .mocked(getFormMetadataWithGuard)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce(testMetadata)

      const { response, container } = await renderResponse(server, {
        method: 'GET',
        url: `/save-and-exit/${FORM_SLUG}/${DRAFT_STATE}`
      })

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.headers['cache-control']).toBe('no-store')
      expect(
        container.getByRole('heading', {
          name: 'Sign in to save your progress',
          level: 1
        })
      ).toBeInTheDocument()
      expect(
        container.getByText(
          'You need to sign in to save your progress for 28 days.'
        )
      ).toBeInTheDocument()
      expect(
        container.getByText(
          'Sign in with your email address. We’ll send you a security code to check it’s you.'
        )
      ).toBeInTheDocument()
      expect(
        container.getByText(
          'If you have not signed in before, we’ll ask for a mobile phone number so you can recover your sign-in later.'
        )
      ).toBeInTheDocument()
      expect(
        container.getByRole('button', { name: 'Sign in' })
      ).toHaveAttribute(
        'href',
        '/auth/sign-in?returnUrl=%2Fsave-and-exit%2Fmy-form-slug%2Fdraft'
      )
      expect(container.getByRole('link', { name: 'Back' })).toHaveAttribute(
        'href',
        '/form/preview/draft/my-form-slug/summary'
      )
      expect(publishSaveAndExitV2Event).not.toHaveBeenCalled()
    })

    it('shows the sign-in page when the session has no tokens', async () => {
      jest
        .mocked(getFormMetadataWithGuard)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce(testMetadata)

      const headers = await session.start(identity, null)

      const { response, container } = await renderResponse(server, {
        method: 'GET',
        url: `/save-and-exit/${FORM_SLUG}/${DRAFT_STATE}`,
        headers
      })

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(
        container.getByRole('heading', {
          name: 'Sign in to save your progress',
          level: 1
        })
      ).toBeInTheDocument()
      expect(publishSaveAndExitV2Event).not.toHaveBeenCalled()
    })

    it('shows the error page when the access token has expired and the provider cannot be reached', async () => {
      jest
        .spyOn(server.app.oidc, 'getConfig')
        .mockRejectedValueOnce(new TypeError('fetch failed'))

      const headers = await session.start(identity, {
        ...tokens,
        accessTokenExpiresAt: Date.now() - 10_000
      })

      const { response, container } = await renderResponse(server, {
        method: 'GET',
        url: `/save-and-exit/${FORM_SLUG}/${DRAFT_STATE}`,
        headers
      })

      expect(response.statusCode).toBe(StatusCodes.SERVICE_UNAVAILABLE)
      expect(
        container.queryByRole('heading', {
          name: 'Sign in to save your progress'
        })
      ).not.toBeInTheDocument()
      expect(publishSaveAndExitV2Event).not.toHaveBeenCalled()
    })

    test('route renders view on success when logged in', async () => {
      jest
        .mocked(getFormMetadataWithGuard)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce(testMetadata)

      const options = {
        method: 'GET',
        url: `/save-and-exit/${FORM_SLUG}/${DRAFT_STATE}`,
        auth: { strategy: 'citizen-session', credentials }
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.headers['cache-control']).toBe('no-store')

      const $mastheadHeading = container.queryByText(
        'Your progress has been saved'
      )

      const $title = container.queryByText('What happens next')

      const $savedFor = container.queryByText(
        'Your answers have been saved for 28 days.'
      )

      const $emailedLink = container.queryByText(
        "We’ve emailed you a link so you can sign in and continue your 'My test form' form later."
      )

      const $checkSpam = container.queryByText(
        'Check your spam folder if you have not received an email after a few minutes.'
      )

      const $button = container.queryByTestId('back-button')

      expect($mastheadHeading).toBeInTheDocument()
      expect($title).toBeInTheDocument()
      expect($savedFor).toBeInTheDocument()
      expect($emailedLink).toBeInTheDocument()
      expect($checkSpam).toBeInTheDocument()
      expect($button?.textContent.trim()).toBe('Back to manage your form')
    })
  })

  test('shows a signed-out citizen the sign-in page (in Welsh)', async () => {
    jest
      .mocked(getFormMetadataWithGuard)
      // @ts-expect-error - allow partial objects for tests
      .mockResolvedValueOnce(testMetadata)

    const { response, container } = await renderResponse(server, {
      method: 'GET',
      url: `/save-and-exit/${FORM_SLUG}/${DRAFT_STATE}?language=cy`
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
    expect(
      container.getByRole('heading', {
        name: 'Mewngofnodwch i gadw eich cynnydd',
        level: 1
      })
    ).toBeInTheDocument()
    expect(
      container.getByText(
        'Mae angen i chi fewngofnodi i gadw eich cynnydd am 28 diwrnod.'
      )
    ).toBeInTheDocument()
    expect(
      container.getByRole('button', { name: 'Mewngofnodi' })
    ).toBeInTheDocument()
  })

  test('route renders view on success when logged in (in Welsh)', async () => {
    jest
      .mocked(getFormMetadataWithGuard)
      // @ts-expect-error - allow partial objects for tests
      .mockResolvedValueOnce(testMetadata)
    jest.mocked(getFormDefinitionWithFallback).mockResolvedValue(
      // @ts-expect-error - partial mock of test data
      {
        metadata: {
          translations: {
            cy: {
              dummy: 'test'
            }
          }
        }
      }
    )
    const options = {
      method: 'GET',
      url: `/save-and-exit/${FORM_SLUG}/${DRAFT_STATE}?language=cy`,
      auth: { strategy: 'citizen-session', credentials }
    }

    const { response, container } = await renderResponse(server, options)

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $mastheadHeading = container.queryByText(
      "Mae eich cynnydd wedi'i gadw"
    )

    const $title = container.queryByText("Beth sy'n digwydd nesaf")

    const $savedFor = container.queryByText(
      "Mae eich atebion wedi'u cadw am 28 o ddiwrnodau."
    )

    const $emailedLink = container.queryByText(
      "Rydym wedi anfon dolen atoch drwy e-bost fel y gallwch fewngofnodi a pharhau â'ch ffurflen 'My test form' yn ddiweddarach."
    )

    const $checkSpam = container.queryByText(
      'Gwiriwch eich ffolder sbam os na fyddwch wedi cael e-bost ar ôl ychydig funudau.'
    )

    const $button = container.queryByTestId('back-button')

    expect($mastheadHeading).toBeInTheDocument()
    expect($title).toBeInTheDocument()
    expect($savedFor).toBeInTheDocument()
    expect($emailedLink).toBeInTheDocument()
    expect($checkSpam).toBeInTheDocument()
    expect($button?.textContent.trim()).toBe('Yn ôl i reoli eich ffurflen')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
