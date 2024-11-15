import { readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

import { markdownToHtml } from '@defra/forms-model'
import { type ServerRegisterPluginObject } from '@hapi/hapi'
import vision, { type ServerViewsConfiguration } from '@hapi/vision'
import capitalize from 'lodash/capitalize.js'
import nunjucks from 'nunjucks'
import resolvePkg from 'resolve'

import pkg from '~/package.json' with { type: 'json' }
import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import { encodeUrl } from '~/src/server/plugins/engine/helpers.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

const logger = createLogger()

const govukFrontendPath = dirname(
  resolvePkg.sync('govuk-frontend/package.json')
)

const pluginPaths = [
  join(config.get('appDir'), 'plugins/engine/views'),
  join(config.get('appDir'), 'views')
]

const nunjucksEnvironment = nunjucks.configure(
  [...pluginPaths, join(govukFrontendPath, 'dist')],
  {
    autoescape: true,
    throwOnUndefined: false,
    trimBlocks: true,
    lstripBlocks: true,
    watch: config.get('isDevelopment'),
    noCache: config.get('isDevelopment')
  }
)
nunjucksEnvironment.addFilter('markdown', markdownToHtml)

let webpackManifest: Record<string, string> | undefined

function nunjucksContext(request: FormRequest | FormRequestPayload | null) {
  const manifestPath = join(config.get('publicDir'), 'assets-manifest.json')

  if (!webpackManifest) {
    try {
      // eslint-disable-next-line -- Allow JSON type 'any'
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      logger.error(`Webpack ${basename(manifestPath)} not found`)
    }
  }

  const { params, path } = request ?? {}
  const isPreviewMode = path?.startsWith(PREVIEW_PATH_PREFIX)

  return {
    appVersion: pkg.version,
    assetPath: '/assets',
    cdpEnvironment: config.get('cdpEnvironment'),
    feedbackLink: encodeUrl(config.get('feedbackLink')),
    phaseTag: config.get('phaseTag'),
    previewMode: isPreviewMode ? params?.state : undefined,
    serviceBannerText: config.get('serviceBannerText'),
    serviceName: capitalize(config.get('serviceName')),
    serviceVersion: config.get('serviceVersion'),
    slug: params?.slug,

    getAssetPath(asset: string) {
      const webpackAssetPath = webpackManifest?.[asset] ?? asset
      return `/${webpackAssetPath}`
    }
  }
}

const compileOptions = {
  environment: nunjucksEnvironment
} satisfies ServerViewsConfiguration['compileOptions']

export default {
  plugin: vision,
  options: {
    engines: {
      html: {
        compile(path: string, options: typeof compileOptions) {
          return (context: ReturnType<typeof nunjucksContext>) =>
            nunjucks.compile(path, options.environment).render(context)
        }
      }
    },
    path: pluginPaths,
    compileOptions,
    isCached: config.get('isProduction'),
    context: nunjucksContext
  }
} satisfies ServerRegisterPluginObject<ServerViewsConfiguration>
