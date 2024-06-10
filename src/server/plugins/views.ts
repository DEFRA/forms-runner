import { dirname, join } from 'node:path'

import { type Request } from '@hapi/hapi'
import vision from '@hapi/vision'
import capitalize from 'lodash/capitalize.js'
import nunjucks from 'nunjucks'
import resolvePkg from 'resolve'

import pkg from '~/package.json' with { type: 'json' }
import config from '~/src/server/config.js'
import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import additionalContexts from '~/src/server/templates/additionalContexts.json' with { type: 'json' }

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
            if (context.nonce) {
              delete Object.assign(context, {
                script_nonce: context['script-nonce']
              })['script-nonce']
              delete Object.assign(context, {
                style_nonce: context.style_nonce
              }).style_nonce
            }

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
            autoescape: true,
            watch: false
          })
          environment.addGlobal('additionalContexts', additionalContexts)
          environment.addFilter('isArray', (x) => Array.isArray(x))
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
      govukFrontendPath
    ],
    isCached: !config.isDev,
    context: (request: Request | null) => ({
      appVersion: pkg.version,
      assetPath: '/assets',
      serviceName: capitalize(config.serviceName),
      feedbackLink: config.feedbackLink,
      pageTitle: config.serviceName + ' - GOV.UK',
      location: request?.app.location,
      BROWSER_REFRESH_URL: config.browserRefreshUrl,
      sessionTimeout: config.sessionTimeout,
      skipTimeoutWarning: false,
      serviceStartPage: config.serviceStartPage || '#',
      phaseTag: config.phaseTag,
      navigation: request?.auth.isAuthenticated
        ? [{ text: 'Sign out', href: '/logout' }]
        : null,
      previewMode: request?.path.includes(PREVIEW_PATH_PREFIX)
        ? request.params.state
        : undefined
    })
  }
}
