import { dirname, join } from 'node:path'

import { type Request, type ServerRegisterPluginObject } from '@hapi/hapi'
import vision, { type ServerViewsConfiguration } from '@hapi/vision'
import capitalize from 'lodash/capitalize.js'
import nunjucks from 'nunjucks'
import resolvePkg from 'resolve'

import pkg from '~/package.json' with { type: 'json' }
import config from '~/src/server/config.js'
import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'

const govukFrontendPath = dirname(
  resolvePkg.sync('govuk-frontend/package.json')
)

const pluginPaths = [
  join(config.appDir, 'plugins/engine/views'),
  join(config.appDir, 'views')
]

const nunjucksEnvironment = nunjucks.configure(
  [...pluginPaths, join(govukFrontendPath, 'dist')],
  {
    autoescape: true,
    throwOnUndefined: false,
    trimBlocks: true,
    lstripBlocks: true,
    watch: config.isDev,
    noCache: config.isDev
  }
)

function nunjucksContext(
  request: Request<{
    Params: {
      slug?: string
      state?: 'draft' | 'live'
    }
  }> | null
) {
  const { app, params, path } = request ?? {}
  const isPreviewMode = path?.startsWith(PREVIEW_PATH_PREFIX)

  return {
    appVersion: pkg.version,
    assetPath: '/assets',
    serviceName: capitalize(config.serviceName),
    feedbackLink: config.feedbackLink,
    location: app?.location,
    phaseTag: config.phaseTag,
    previewMode: isPreviewMode ? params?.state : undefined,
    slug: params?.slug
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
    isCached: config.isProd,
    context: nunjucksContext
  }
} satisfies ServerRegisterPluginObject<ServerViewsConfiguration>
