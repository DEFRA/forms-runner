import crumb, { type RegisterOptions } from '@hapi/crumb'
import { type ServerRegisterPluginObject } from '@hapi/hapi'

import config from '~/src/server/config.js'
import { type RouteConfig } from '~/src/server/types.js'

export const configureCrumbPlugin = (
  routeConfig?: RouteConfig
): ServerRegisterPluginObject<RegisterOptions> => {
  return {
    plugin: crumb,
    options: {
      logUnauthorized: true,
      enforce: routeConfig?.enforceCsrf ?? config?.enforceCsrf,
      cookieOptions: {
        isSecure: config.isProd
      }
    }
  }
}
