import { join } from 'node:path'

import { type HandlerDecorations, type ServerRoute } from '@hapi/hapi'

import { config } from '~/src/config/index.js'

export default [
  {
    from: '/javascripts/{path*}',
    to: join(config.get('publicDir'), 'javascripts'),
    immutable: true
  },
  {
    from: '/stylesheets/{path*}',
    to: join(config.get('publicDir'), 'stylesheets'),
    immutable: true
  },
  {
    from: '/assets/fonts/{path*}',
    to: join(config.get('publicDir'), 'assets/fonts'),
    immutable: true
  },
  {
    from: '/assets/{path*}',
    to: join(config.get('publicDir'), 'assets'),
    immutable: false
  }
].map((options) => {
  return {
    method: 'GET',
    path: options.from,
    options: {
      cache: {
        // Historically, an infinite max-age is the 32-bit maximum 2,147,483,648
        // https://datatracker.ietf.org/doc/html/rfc9111#section-1.2.2
        otherwise: options.immutable
          ? 'public, max-age=2147483648, immutable'
          : 'public, max-age=0, must-revalidate'
      },
      handler: {
        directory: {
          path: options.to
        }
      } satisfies HandlerDecorations
    }
  } satisfies ServerRoute
})
