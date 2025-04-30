import { dirname, join } from 'node:path'

import nunjucks from 'nunjucks'
import resolvePkg from 'resolve'

import { config } from '~/src/config/index.js'

const govukFrontendPath = dirname(
  resolvePkg.sync('govuk-frontend/package.json')
)

export const paths = [join(config.get('appDir'), 'views')]

export const environment = nunjucks.configure(
  [...paths, join(govukFrontendPath, 'dist')],
  {
    trimBlocks: true,
    lstripBlocks: true,
    watch: config.get('isDevelopment'),
    noCache: config.get('isDevelopment')
  }
)
