import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import config from '../config.js'

const routesDir = dirname(fileURLToPath(import.meta.url))
const modulesDir = join(routesDir, '../../../node_modules')

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
            join(modulesDir, 'accessible-autocomplete', 'dist'),
            join(modulesDir, 'govuk-frontend', 'govuk'),
            join(modulesDir, 'govuk-frontend', 'govuk', 'assets'),
            join(modulesDir, 'hmpo-components', 'assets')
          ]
        }
      }
    }
  }
]
