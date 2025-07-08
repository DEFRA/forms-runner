import { dirname, join } from 'node:path'

import { markdownToHtml } from '@defra/forms-model'
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

/*
  We use the evaluate filter to change the page title for form pages based on the user's answer.
  The engine provides its own implementation of evaluate filter, which is used on pages served by the engine.
  On other pages hosted by runner, we still require the filter but it's not dynamic so we can return the initial value.
*/
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
environment.addFilter('evaluate', (value) => value)
environment.addFilter('markdown', (value) =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  markdownToHtml(value)
)

environment.addGlobal('govukRebrand', true)
