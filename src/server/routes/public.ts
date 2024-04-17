import { dirname, join } from 'node:path'
import { cwd } from 'node:process'

import resolvePkg from 'resolve'

import config from '../config.js'

const [accessibleAutocompletePath, govukFrontendPath, hmpoComponentsPath] = [
  'accessible-autocomplete',
  'govuk-frontend',
  'hmpo-components'
].map((pkgName) =>
  dirname(
    resolvePkg.sync(`${pkgName}/package.json`, {
      basedir: cwd()
    })
  )
)

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
            join(hmpoComponentsPath, 'assets'),
            accessibleAutocompletePath
          ]
        }
      }
    }
  }
]
