import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const routesDir = dirname(fileURLToPath(import.meta.url))
const publicDir = join(routesDir, '../../../public')
const modulesDir = join(routesDir, '../../../node_modules')

export default [
  {
    method: 'GET',
    path: '/assets/{path*}',
    options: {
      handler: {
        directory: {
          path: [
            join(publicDir, 'static'),
            join(publicDir, 'build'),
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
