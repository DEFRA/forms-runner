import crumb from '@hapi/crumb'
import { type ServerRegisterPluginObject } from '@hapi/hapi'

import { type RouteConfig } from '~/src/server/types.js'

export const configureCrumbPlugin = (
  config,
  routeConfig?: RouteConfig
): ServerRegisterPluginObject<crumb.RegisterOptions> => {
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
