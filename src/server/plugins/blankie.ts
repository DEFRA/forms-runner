import { type ServerRegisterPluginObject } from '@hapi/hapi'
import Blankie from 'blankie'
import flatten from 'lodash/flatten.js'

import { config } from '~/src/config/index.js'

function combine(...values: string[][]) {
  return [...new Set(flatten(values))]
}

const googleAnalyticsOptions = {
  scriptSrc: ['https://*.googletagmanager.com'],
  imgSrc: ['https://*.google-analytics.com', 'https://*.googletagmanager.com'],
  connectSrc: [
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://*.googletagmanager.com'
  ]
}

export const configureBlankiePlugin = (): ServerRegisterPluginObject<
  Record<string, boolean | string | string[]>
> => {
  const gaTrackingId = config.get('googleAnalyticsTrackingId')

  /*
  Note that unsafe-inline is a fallback for old browsers that don't support nonces. It will be ignored by modern browsers as the nonce is provided.
  */
  return {
    plugin: Blankie,
    options: {
      defaultSrc: ['self'],
      fontSrc: ['self', 'data:'],
      connectSrc: combine(
        ['self'],
        gaTrackingId ? googleAnalyticsOptions.connectSrc : []
      ),
      scriptSrc: combine(
        ['self', 'strict-dynamic', 'unsafe-inline'],
        gaTrackingId ? googleAnalyticsOptions.scriptSrc : []
      ),
      styleSrc: ['self', 'unsafe-inline'],
      imgSrc: combine(
        ['self'],
        gaTrackingId ? googleAnalyticsOptions.imgSrc : []
      ),
      frameSrc: ['self', 'data:'],
      generateNonces: true
    }
  }
}
