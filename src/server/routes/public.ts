import { dirname, join } from 'node:path'

import { type HandlerDecorations, type ServerRoute } from '@hapi/hapi'
import resolvePkg from 'resolve'

import config from '~/src/server/config.js'

const [accessibleAutocompletePath, govukFrontendPath] = [
  'accessible-autocomplete',
  'govuk-frontend'
].map((pkgName) => {
  return dirname(resolvePkg.sync(`${pkgName}/package.json`))
})

export default [
  {
    method: 'GET',
    path: '/javascripts/{path*}',
    options: {
      handler: {
        directory: {
          path: [
            join(config.publicDir, 'javascripts'),
            join(govukFrontendPath, 'govuk'),
            join(accessibleAutocompletePath, 'dist')
          ]
        }
      } satisfies HandlerDecorations
    }
  },
  {
    method: 'GET',
    path: '/stylesheets/{path*}',
    options: {
      handler: {
        directory: {
          path: [
            join(config.publicDir, 'stylesheets'),
            join(govukFrontendPath, 'govuk'),
            join(accessibleAutocompletePath, 'dist')
          ]
        }
      } satisfies HandlerDecorations
    }
  },
  {
    method: 'GET',
    path: '/assets/{path*}',
    options: {
      handler: {
        directory: {
          path: join(govukFrontendPath, 'govuk/assets')
        }
      } satisfies HandlerDecorations
    }
  }
] satisfies ServerRoute[]
