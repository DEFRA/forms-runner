import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

import {
  checkFormStatus,
  encodeUrl,
  safeGenerateCrumb
} from '@defra/forms-engine-plugin/engine/helpers.js'
import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'

import pkg from '~/package.json' with { type: 'json' }
import { parseCookieConsent } from '~/src/common/cookies.js'
import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

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
      logger.info(
        `[webpackManifestMissing] Webpack ${basename(manifestPath)} not found - running without asset manifest`
      )
    }
  }

  const { params, query = {}, response, state } = request ?? {}

  const isForceAccess = 'force' in query
  const { isPreview: isPreviewMode, state: formState } = checkFormStatus(params)

  // Only add the slug in to the context if the response is OK.
  // Footer meta links are not rendered when the slug is missing.
  const isResponseOK =
    !Boom.isBoom(response) && response?.statusCode === StatusCodes.OK

  /** @type {ViewContext} */
  const ctx = {
    appVersion: pkg.version,
    assetPath: '/assets',
    config: {
      cdpEnvironment: config.get('cdpEnvironment'),
      designerUrl: config.get('designerUrl'),
      feedbackLink: encodeUrl(config.get('feedbackLink')),
      phaseTag: config.get('phaseTag'),
      serviceBannerText: config.get('serviceBannerText'),
      serviceName: config.get('serviceName'),
      serviceVersion: config.get('serviceVersion')
    },
    crumb: safeGenerateCrumb(request),
    cspNonce: request?.plugins.blankie?.nonces?.script,
    currentPath: request ? `${request.path}${request.url.search}` : undefined,
    previewMode: isPreviewMode ? formState : undefined,
    slug: isResponseOK ? params?.slug : undefined,

    getAssetPath: (asset = '') => {
      return `/${webpackManifest?.[asset] ?? asset}`
    }
  }

  if (!isForceAccess) {
    ctx.config.googleAnalyticsTrackingId = config.get(
      'googleAnalyticsTrackingId'
    )

    if (typeof state?.cookieConsent === 'string') {
      ctx.cookieConsent = parseCookieConsent(state.cookieConsent)
    }
  }

  return ctx
}

/**
 * @import { ViewContext } from '~/src/server/plugins/nunjucks/types.js'
 * @import { FormRequest, FormRequestPayload } from '~/src/server/routes/types.js'
 */
