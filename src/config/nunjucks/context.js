import path from 'path'

import { config } from '~/src/config'
import { createLogger } from '~/src/server/common/helpers/logging/logger'

const logger = createLogger()
const appPathPrefix = config.get('appPathPrefix')
const manifestPath = path.resolve(
  config.get('root'),
  '.public',
  'manifest.json'
)
let webpackManifest

try {
  webpackManifest = require(manifestPath)
} catch (error) {
  logger.error('Webpack Manifest assets file not found')
}

function buildNavigation(request) {
  return [
    {
      text: 'Home',
      url: appPathPrefix,
      isActive: request.path === `${appPathPrefix}`
    }
  ]
}

function context(request) {
  return {
    serviceName: config.get('serviceName'),
    serviceUrl: config.get('appPathPrefix'),
    breadcrumbs: [],
    navigation: buildNavigation(request),
    getAssetPath: function (asset) {
      const webpackAssetPath = webpackManifest[asset]

      return `${appPathPrefix}/public/${webpackAssetPath}`
    }
  }
}

export { context }
