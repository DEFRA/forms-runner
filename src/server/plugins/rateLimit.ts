import rateLimit from 'hapi-rate-limit'

import { type RouteConfig } from '~/src/server/types.js'

export interface RateOptions {
  enabled?: boolean
  userLimit?: number
}

export const configureRateLimitPlugin = (routeConfig?: RouteConfig) => {
  return {
    plugin: rateLimit,
    options: routeConfig
      ? routeConfig.rateOptions || { enabled: false }
      : {
          trustProxy: true,
          pathLimit: false,
          userLimit: false,
          getIpFromProxyHeader: (header) => {
            // use the last in the list as this will be the 'real' ELB header
            const ips = header.split(',')
            return ips[ips.length - 1]
          }
        }
  }
}
