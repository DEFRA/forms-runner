import { config } from '~/src/config/index.js'
import { configureBlankiePlugin } from '~/src/server/plugins/blankie.js'

describe('Server Blankie Plugin', () => {
  test('configuration default options are provided', () => {
    config.set('googleTagManagerContainerId', '')

    const { options } = configureBlankiePlugin()

    expect(options).toEqual({
      defaultSrc: ['self'],
      baseUri: ['none'],
      fontSrc: ['self', 'data:'],
      frameSrc: ['self'],
      connectSrc: ['self', 'https://test-uploader.cdp-int.defra.cloud'],
      scriptSrc: ['self'],
      styleSrc: ['self', 'unsafe-inline'],
      imgSrc: ['self', 'data:'],
      workerSrc: ['self', 'blob:'],
      formAction: ['self'],
      frameAncestors: ['none'],
      objectSrc: ['none'],
      generateNonces: true
    })
  })

  test('configuration default and GTM options are provided', () => {
    config.set('googleTagManagerContainerId', 'GTM-XXXXXXXX')

    const { options } = configureBlankiePlugin()

    expect(options).toEqual({
      defaultSrc: ['self'],
      baseUri: ['none'],
      fontSrc: ['self', 'data:'],
      frameSrc: ['self', 'https://www.googletagmanager.com'],
      connectSrc: [
        'self',
        'https://www.google-analytics.com',
        'https://analytics.google.com',
        'https://www.googletagmanager.com',
        'https://test-uploader.cdp-int.defra.cloud'
      ],
      scriptSrc: ['self', 'https://www.googletagmanager.com'],
      styleSrc: ['self', 'unsafe-inline'],
      imgSrc: [
        'self',
        'data:',
        'https://www.google-analytics.com',
        'https://www.googletagmanager.com'
      ],
      workerSrc: ['self', 'blob:'],
      formAction: ['self'],
      frameAncestors: ['none'],
      objectSrc: ['none'],
      generateNonces: true
    })
  })

  test('configuration includes uploaderUrl when provided', () => {
    config.set('googleTagManagerContainerId', '')
    config.set('uploaderUrl', 'https://some-random-uploader.example.com')

    const { options } = configureBlankiePlugin()

    expect(options?.connectSrc).toContain(
      'https://some-random-uploader.example.com'
    )
  })

  test('configuration does not include uploaderUrl when not provided', () => {
    config.set('googleTagManagerContainerId', '')
    config.set('uploaderUrl', '')

    const { options } = configureBlankiePlugin()

    expect(options?.connectSrc).toEqual(['self'])
  })
})
