import { dirname, join } from 'node:path'
import { cwd } from 'node:process'

import { type Request } from '@hapi/hapi'
import vision from '@hapi/vision'
import capitalize from 'lodash/capitalize.js'
import nunjucks from 'nunjucks'
import resolvePkg from 'resolve'

import pkg from '~/package.json' with { type: 'json' }
import config from '~/src/server/config.js'
import additionalContexts from '~/src/server/templates/additionalContexts.json' with { type: 'json' }

const [govukFrontendPath, hmpoComponentsPath] = [
  'govuk-frontend',
  'hmpo-components'
].map((pkgName) =>
  dirname(
    resolvePkg.sync(`${pkgName}/package.json`, {
      basedir: cwd()
    })
  )
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
      govukFrontendPath,
      join(hmpoComponentsPath, 'components')
    ],
    isCached: !config.isDev,
    context: (request: Request | null) => ({
      appVersion: pkg.version,
      assetPath: '/assets',
      cookiesPolicy: request?.state.cookies_policy,
      serviceName: capitalize(config.serviceName),
      feedbackLink: config.feedbackLink,
      pageTitle: config.serviceName + ' - GOV.UK',
      analyticsAccount: config.analyticsAccount,
      gtmId1: config.gtmId1,
      gtmId2: config.gtmId2,
      location: request?.app.location,
      matomoId: config.matomoId,
      matomoUrl: config.matomoUrl,
      BROWSER_REFRESH_URL: config.browserRefreshUrl,
      sessionTimeout: config.sessionTimeout,
      skipTimeoutWarning: false,
      serviceStartPage: config.serviceStartPage || '#',
      privacyPolicyUrl: config.privacyPolicyUrl || '/help/privacy',
      phaseTag: config.phaseTag,
      navigation: request?.auth.isAuthenticated
        ? [{ text: 'Sign out', href: '/logout' }]
        : null
    })
  }
}
