import { join } from 'node:path'

import { type HandlerDecorations, type ServerRoute } from '@hapi/hapi'

import config from '~/src/server/config.js'

export default [
  {
    method: 'GET',
    path: '/javascripts/{path*}',
    options: {
      handler: {
        directory: {
          path: join(config.publicDir, 'javascripts')
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
          path: join(config.publicDir, 'stylesheets')
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
          path: join(config.publicDir, 'assets')
        }
      } satisfies HandlerDecorations
    }
  }
] satisfies ServerRoute[]
