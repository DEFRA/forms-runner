import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

import pkg from '~/package.json' with { type: 'json' }
import { parseCookieConsent } from '~/src/common/cookies.js'
import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import { encodeUrl } from '~/src/server/plugins/engine/helpers.js'

const logger = createLogger()

/** @type {Record<string, string> | undefined} */
let webpackManifest

/**
 * @param {FormRequest | FormRequestPayload | null} request
 */
export function context(request) {
  const manifestPath = join(config.get('publicDir'), 'assets-manifest.json')

  if (!webpackManifest) {
    try {
      // eslint-disable-next-line -- Allow JSON type 'any'
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      logger.error(`Webpack ${basename(manifestPath)} not found`)
    }
  }

  const { params, path, state } = request ?? {}

  let cookieConsent
  let cookieConsentUpdated

  if (typeof state?.cookieConsent === 'string') {
    cookieConsent = parseCookieConsent(state.cookieConsent)
    cookieConsentUpdated = request?.method === 'post' && cookieConsent.dismissed
  }

  const isPreviewMode = path?.startsWith(PREVIEW_PATH_PREFIX)

  return {
    appVersion: pkg.version,
    assetPath: '/assets',
    cdpEnvironment: config.get('cdpEnvironment'),
    feedbackLink: encodeUrl(config.get('feedbackLink')),
    phaseTag: config.get('phaseTag'),
    previewMode: isPreviewMode ? params?.state : undefined,
    serviceBannerText: config.get('serviceBannerText'),
    serviceName: config.get('serviceName'),
    serviceVersion: config.get('serviceVersion'),
    slug: params?.slug,
    cookieConsent,
    cookieConsentUpdated,
    googleAnalyticsTrackingId: config.get('googleAnalyticsTrackingId'),
    cspNonce: request?.plugins.blankie?.nonces?.script,
    currentPath: request
      ? `${request.path.toString()}${request.url.search}`
      : undefined,

    getAssetPath: (asset = '') => {
      return `/${webpackManifest?.[asset] ?? asset}`
    }
  }
}

/**
 * @import { FormRequest, FormRequestPayload } from '~/src/server/routes/types.js'
 */
