import { dirname, join } from 'node:path'

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
    path: '/assets/{path*}',
    options: {
      handler: {
        directory: {
          path: [
            join(config.publicDir, 'static'),
            join(config.publicDir, 'build'),
            join(govukFrontendPath, 'govuk'),
            join(govukFrontendPath, 'govuk/assets'),
            join(accessibleAutocompletePath, 'dist')
          ]
        }
      }
    }
  }
]
