import { type ServerRegisterPluginObject } from '@hapi/hapi'
import Blankie from 'blankie'

import { config } from '~/src/config/index.js'

const googleAnalyticsOptions = {
  imgSrc: [
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com'
  ],
  connectSrc: [
    'https://www.google-analytics.com',
    'https://analytics.google.com',
    'https://www.googletagmanager.com',
    'https://region1.google-analytics.com'
  ],
  frameSrc: ['https://www.googletagmanager.com']
}

export const configureBlankiePlugin = (): ServerRegisterPluginObject<
  Record<string, boolean | string | string[]>
> => {
  const gtmContainerId = config.get('googleTagManagerContainerId')
  const uploaderUrl = config.get('uploaderUrl')

  return {
    plugin: Blankie,
    options: {
      defaultSrc: ['self'],
      baseUri: ['none'],
      fontSrc: ['self', 'data:'],
      connectSrc: [
        ['self'],
        gtmContainerId ? googleAnalyticsOptions.connectSrc : [],
        uploaderUrl ? [uploaderUrl] : []
      ].flat(),
      scriptSrc: ['strict-dynamic'],
      styleSrc: ['self', 'unsafe-inline'],
      imgSrc: [
        ['self', 'data:'],
        gtmContainerId ? googleAnalyticsOptions.imgSrc : []
      ].flat(),
      frameSrc: gtmContainerId ? googleAnalyticsOptions.frameSrc : ['none'],
      workerSrc: ['blob:'],
      formAction: ['self'],
      frameAncestors: ['none'],
      objectSrc: ['none'],
      generateNonces: 'script'
    }
  }
}
