import {
  checkFormStatus,
  getCacheService
} from '@defra/forms-engine-plugin/engine/helpers.js'
import { FormStatus } from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'

import { config } from '~/src/config/index.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadataWithGuard } from '~/src/server/services/formMetadataGuards.js'
import { getFormDefinitionWithFallback } from '~/src/server/services/helpers/formsServiceHelper.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/formMetadataGuards.js')
jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/services/helpers/formsServiceHelper.js')
jest.mock('~/src/server/helpers/error-helper.js')
jest.mock('@defra/forms-engine-plugin/engine/form-availability.js')
jest.mock('@defra/forms-engine-plugin/engine/helpers.js')
jest.mock('~/src/server/messaging/publish.js')

const DRAFT_STATE = 'draft'

/** A citizen who has signed in, as the citizen-session scheme presents them */
const credentials = {
  iss: 'http://localhost:3011',
  sub: 'sub-1',
  email: 'citizen@example.com',
  idToken: 'header.payload.signature'
}

describe('Save-and-exit check routes', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    config.set('useSignInFeature', true)

    server = await createServer({
      enforceCsrf: false
    })

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
    config.set('useSignInFeature', false)
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
      getState: jest.fn().mockResolvedValueOnce({ key: 'val' }),
      clearState: jest.fn()
    }))
    jest
      .mocked(checkFormStatus)
      .mockReturnValueOnce({ isPreview: true, state: FormStatus.Draft })
  })

  const FORM_SLUG = 'my-form-slug'

  const testMetadata = {
    slug: FORM_SLUG,
    id: '9a48c529-16eb-4ff7-98be-e8aec801b4ed',
    title: 'My test form'
  }

  describe('GET /save-and-exit-v2/{slug}/{state?}', () => {
    it('sends a signed-out citizen to sign in first', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/save-and-exit-v2/${FORM_SLUG}/${DRAFT_STATE}`
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        '/auth/sign-in?returnUrl=%2Fsave-and-exit-v2%2Fmy-form-slug%2Fdraft'
      )
    })

    test('route renders view on success when logged in', async () => {
      jest
        .mocked(getFormMetadataWithGuard)
        // @ts-expect-error - allow partial objects for tests
        .mockResolvedValueOnce(testMetadata)

      const options = {
        method: 'GET',
        url: `/save-and-exit-v2/${FORM_SLUG}/${DRAFT_STATE}`,
        auth: { strategy: 'citizen-session', credentials }
      }

      const { response, container } = await renderResponse(server, options)

      expect(response.statusCode).toBe(StatusCodes.OK)

      const $mastheadHeading = container.getByText(
        'Your progress has been saved'
      )

      const $title = container.getByText('What happens next')

      const $savedFor = container.getByText(
        'Your answers have been saved for 28 days.'
      )

      const $emailedLink = container.getByText(
        "We’ve emailed you a link so you can sign in and continue your 'My test form' form later."
      )

      const $checkSpam = container.getByText(
        'Check your spam folder if you have not received an email after a few minutes.'
      )

      const $button = container.queryByRole('link', {
        name: 'Sign in'
      })

      expect($mastheadHeading).toBeInTheDocument()
      expect($title).toBeInTheDocument()
      expect($savedFor).toBeInTheDocument()
      expect($emailedLink).toBeInTheDocument()
      expect($checkSpam).toBeInTheDocument()
      expect($button).not.toBeInTheDocument()
    })
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
      url: `/save-and-exit-v2/${FORM_SLUG}/${DRAFT_STATE}?language=cy`,
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

    const $button = container.getByTestId('signin-button')

    expect($mastheadHeading).toBeInTheDocument()
    expect($title).toBeInTheDocument()
    expect($savedFor).toBeInTheDocument()
    expect($emailedLink).toBeInTheDocument()
    expect($checkSpam).toBeInTheDocument()
    expect($button.textContent.trim()).toBe('Mewngofnodi')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
