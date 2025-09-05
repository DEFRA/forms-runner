import { join } from 'node:path'

import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

jest.mock('~/src/server/services/formsService.js')
jest.mock('~/src/server/messaging/publish.js')

describe('Save and exit', () => {
  /** @type {Server} */
  let server

  // Create server before tests
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  it('shows the details page', async () => {
    const options = {
      method: 'GET',
      url: '/save-and-exit/basic'
    }

    const { container } = await renderResponse(server, options)

    const $heading = container.getByRole('heading', {
      name: 'Save your progress for later',
      level: 1
    })

    const $emailLabel = container.getByLabelText('Your email address')
    const $emailConfirmationLabel = container.getByLabelText(
      'Confirm your email address'
    )
    const $securityQuestionLegend = container.getByRole('group', {
      name: 'Choose a security question to answer'
    })
    const $securityAnswerLabel = container.getByLabelText(
      'Your answer to the security question'
    )

    expect($heading).toBeInTheDocument()
    expect($emailLabel).toBeInTheDocument()
    expect($emailConfirmationLabel).toBeInTheDocument()
    expect($securityQuestionLegend).toBeInTheDocument()
    expect($securityAnswerLabel).toBeInTheDocument()
  })

  it('shows the details page with errors', async () => {
    const options = {
      method: 'POST',
      url: '/save-and-exit/basic',
      payload: {
        email: '',
        emailConfirmation: '',
        securityAnswer: ''
      }
    }

    const { container } = await renderResponse(server, options)

    const $errorSummary = container.getByRole('alert')
    const $heading = within($errorSummary).getByRole('heading', {
      name: 'There is a problem',
      level: 2
    })
    const $errorItems = within($errorSummary).getAllByRole('listitem')

    expect($errorSummary).toBeInTheDocument()
    expect($heading).toBeInTheDocument()
    expect($errorItems[0]).toHaveTextContent('Enter an email address')
    expect($errorItems[1]).toHaveTextContent('Choose a security question')
    expect($errorItems[2]).toHaveTextContent(
      'Enter an answer to the security question'
    )
  })

  it('posts details page successfully', async () => {
    const options = {
      method: 'POST',
      url: '/save-and-exit/basic',
      payload: {
        email: 'enrique.chase@defra.gov.uk',
        emailConfirmation: 'enrique.chase@defra.gov.uk',
        securityQuestion: 'audio-recommendation',
        securityAnswer: 'Chase & Status'
      }
    }

    const { response } = await renderResponse(server, options)

    expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe('/save-and-exit/basic/confirmation')

    const headers = getCookieHeader(response, ['session', 'crumb'])

    const { response: response2 } = await renderResponse(server, {
      method: 'get',
      url: '/save-and-exit/basic/confirmation',
      headers
    })

    expect(response2.statusCode).toBe(StatusCodes.OK)
  })

  it('confirmation page errors if no details are flashed', async () => {
    const options = {
      method: 'GET',
      url: '/save-and-exit/basic/confirmation'
    }

    const { response } = await renderResponse(server, options)

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
