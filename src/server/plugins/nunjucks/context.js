import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'

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

  const { params, path, state, response } = request ?? {}

  /** @type {CookieConsent | undefined} */
  let cookieConsent

  if (typeof state?.cookieConsent === 'string') {
    cookieConsent = parseCookieConsent(state.cookieConsent)
  }

  const isPreviewMode = path?.startsWith(PREVIEW_PATH_PREFIX)

  // Only add the slug in to the context if the response is OK.
  // Footer meta links are not rendered when the slug is missing.
  const isResponseOK =
    !Boom.isBoom(response) && response?.statusCode === StatusCodes.OK

  return /** @type {ViewContext} */ ({
    appVersion: pkg.version,
    assetPath: '/assets',
    config: {
      cdpEnvironment: config.get('cdpEnvironment'),
      feedbackLink: encodeUrl(config.get('feedbackLink')),
      googleAnalyticsTrackingId: config.get('googleAnalyticsTrackingId'),
      phaseTag: config.get('phaseTag'),
      serviceBannerText: config.get('serviceBannerText'),
      serviceName: config.get('serviceName'),
      serviceVersion: config.get('serviceVersion')
    },
    cookieConsent,
    crumb: request?.server.plugins.crumb.generate?.(request),
    cspNonce: request?.plugins.blankie?.nonces?.script,
    currentPath: request ? `${request.path}${request.url.search}` : undefined,
    previewMode: isPreviewMode ? params?.state : undefined,
    slug: isResponseOK ? params?.slug : undefined,

    getAssetPath: (asset = '') => {
      return `/${webpackManifest?.[asset] ?? asset}`
    }
  })
}

/**
 * @import { CookieConsent } from '~/src/common/types.js'
 * @import { ViewContext } from '~/src/server/plugins/nunjucks/types.js'
 * @import { FormRequest, FormRequestPayload } from '~/src/server/routes/types.js'
 */
