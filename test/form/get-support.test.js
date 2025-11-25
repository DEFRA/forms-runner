import { join } from 'node:path'

import { config } from '~/src/config/index.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/services/formsService.js')

describe('Get support page', () => {
  /** @type {Server} */
  let server

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterEach(async () => {
    await server.stop()
  })

  it('renders the get-support page with all contact metadata', async () => {
    const contact = {
      phone:
        'Telephone: **020 7946 0101**\n\n### Opening hours\n\nMonday to Friday, *8am to 6pm*',
      email: {
        address: 'support@example.com',
        responseTime: 'We aim to reply within 2 working days.'
      },
      online: {
        url: 'https://contact.example.com',
        text: 'Contact us online'
      }
    }
    jest
      .mocked(getFormMetadata)
      .mockResolvedValue({ ...fixtures.form.metadata, contact })
    config.set('serviceName', 'Submit a form to Defra')

    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/help/get-support/basic'
    })

    // Phone section
    const telHeading = container.getByRole('heading', {
      level: 2,
      name: 'Telephone'
    })
    expect(telHeading).toBeInTheDocument()
    // Validate the telephone block HTML
    expect(telHeading.nextElementSibling?.outerHTML)
      .toBe(`<div class="app-prose-scope">
              <p>Telephone: <strong>020 7946 0101</strong></p>
<h5>Opening hours</h5>
<p>Monday to Friday, <em>8am to 6pm</em></p>

            </div>`)

    // Email section
    const emailHeading = container.getByRole('heading', {
      level: 2,
      name: 'Email'
    })
    expect(emailHeading).toBeInTheDocument()
    expect(container.getByText(contact.email.address)).toBeInTheDocument()
    expect(container.getByText(contact.email.responseTime)).toBeInTheDocument()
    // Online section
    const onlineHeading = container.getByRole('heading', {
      level: 2,
      name: 'Online contact form'
    })
    expect(onlineHeading).toBeInTheDocument()
    expect(container.getByText(contact.online.text)).toBeInTheDocument()

    const onlineLink = container.getByText(contact.online.text).closest('a')
    expect(onlineLink?.href).toContain('https://contact.example.com')
  })

  it('does not render any contact sections if form.contact is missing', async () => {
    jest
      .mocked(getFormMetadata)
      .mockResolvedValue({ ...fixtures.form.metadata, contact: undefined })

    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/help/get-support/basic'
    })

    expect(container.queryByText('Telephone')).toBeNull()
    expect(container.queryByText('Email')).toBeNull()
    expect(container.queryByText('Online contact form')).toBeNull()
  })

  it('does not render telephone section if form.contact.phone is missing', async () => {
    jest.mocked(getFormMetadata).mockResolvedValue({
      ...fixtures.form.metadata,
      contact: {}
    })

    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()

    const { container } = await renderResponse(server, {
      method: 'GET',
      url: '/help/get-support/basic'
    })

    expect(container.queryByText('Telephone')).toBeNull()
    expect(container.queryByText('Email')).toBeNull()
    expect(container.queryByText('Online contact form')).toBeNull()
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
