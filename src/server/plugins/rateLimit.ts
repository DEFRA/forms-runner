import { type Plugin, type ServerRegisterPluginObject } from '@hapi/hapi'
import rateLimit from 'hapi-rate-limit'

import { type RouteConfig } from '~/src/server/types.js'

export interface RateOptions {
  enabled?: boolean
  userLimit?: number
}

export const configureRateLimitPlugin = (routeConfig?: RouteConfig) => {
  const options = routeConfig
    ? (routeConfig.rateOptions ?? {
        enabled: false
      })
    : {
        trustProxy: true,
        pathLimit: false,
        userLimit: false,
        getIpFromProxyHeader: (header: string) => {
          // use the last in the list as this will be the 'real' ELB header
          const ips = header.split(',')
          return ips.at(-1)
        }
      }

  return {
    plugin: rateLimit as Plugin<typeof options>,
    options
  } satisfies ServerRegisterPluginObject<typeof options>
}
