import crumb, { type RegisterOptions } from '@hapi/crumb'
import { type ServerRegisterPluginObject } from '@hapi/hapi'

import { config } from '~/src/config/index.js'
import { type RouteConfig } from '~/src/server/types.js'

export const configureCrumbPlugin = (
  routeConfig?: RouteConfig
): ServerRegisterPluginObject<RegisterOptions> => {
  return {
    plugin: crumb,
    options: {
      logUnauthorized: true,
      enforce: routeConfig?.enforceCsrf ?? config.get('enforceCsrf'),
      cookieOptions: {
        isSecure: config.get('isProduction')
      }
    }
  }
}
