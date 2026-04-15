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
      frameSrc: ['none'],
      connectSrc: ['self', 'https://test-uploader.cdp-int.defra.cloud'],
      scriptSrc: ['strict-dynamic'],
      styleSrc: ['self', 'unsafe-inline'],
      imgSrc: ['self', 'data:'],
      workerSrc: ['blob:'],
      formAction: ['self'],
      frameAncestors: ['none'],
      objectSrc: ['none'],
      generateNonces: 'script'
    })
  })

  test('configuration default and GTM options are provided', () => {
    config.set('googleTagManagerContainerId', 'GTM-XXXXXXXX')

    const { options } = configureBlankiePlugin()

    expect(options).toEqual({
      defaultSrc: ['self'],
      baseUri: ['none'],
      fontSrc: ['self', 'data:'],
      frameSrc: ['https://www.googletagmanager.com'],
      connectSrc: [
        'self',
        'https://www.google-analytics.com',
        'https://analytics.google.com',
        'https://www.googletagmanager.com',
        'https://region1.google-analytics.com',
        'https://test-uploader.cdp-int.defra.cloud'
      ],
      scriptSrc: ['strict-dynamic'],
      styleSrc: ['self', 'unsafe-inline'],
      imgSrc: [
        'self',
        'data:',
        'https://www.google-analytics.com',
        'https://www.googletagmanager.com'
      ],
      workerSrc: ['blob:'],
      formAction: ['self'],
      frameAncestors: ['none'],
      objectSrc: ['none'],
      generateNonces: 'script'
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
