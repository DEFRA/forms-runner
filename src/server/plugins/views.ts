import { dirname, join } from 'node:path'

import { type Request } from '@hapi/hapi'
import vision from '@hapi/vision'
import capitalize from 'lodash/capitalize.js'
import nunjucks from 'nunjucks'
import resolvePkg from 'resolve'

import pkg from '~/package.json' with { type: 'json' }
import config from '~/src/server/config.js'
import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'

const govukFrontendPath = dirname(
  resolvePkg.sync('govuk-frontend/package.json')
)

export default {
  plugin: vision,
  options: {
    engines: {
      html: {
        compile: (src, options) => {
          const template = nunjucks.compile(src, options.environment)

          return (context) => {
            const html = template.render(
              context /* , function (err, value) {
              console.error(err)
            } */
            )
            return html
          }
        },
        prepare: (options, next) => {
          const environment = nunjucks.configure(options.path, {
            trimBlocks: true,
            lstripBlocks: true,
            watch: config.isDev,
            noCache: config.isDev
          })
          options.compileOptions.environment = environment

          return next()
        }
      }
    },
    path: [
      /**
       * Array of directories to check for nunjucks templates.
       */
      join(config.appDir, 'views'),
      join(config.appDir, 'plugins/engine/views'),
      join(govukFrontendPath, 'dist')
    ],
    isCached: !config.isDev,
    context: (request: Request | null) => ({
      appVersion: pkg.version,
      assetPath: '/assets',
      serviceName: capitalize(config.serviceName),
      feedbackLink: config.feedbackLink,
      location: request?.app.location,
      phaseTag: config.phaseTag,
      previewMode: request?.path.startsWith(PREVIEW_PATH_PREFIX)
        ? request.params.state
        : undefined,
      slug: request?.params.slug
    })
  }
}
