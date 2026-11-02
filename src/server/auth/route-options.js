import { CITIZEN_SESSION } from '~/src/server/auth/scheme.js'

/** @type {RouteOptionsAccess} */
export const CITIZEN_AUTH_ROUTE_OPTIONS = {
  mode: 'required',
  strategy: CITIZEN_SESSION
}

/**
 * @import { RouteOptionsAccess } from '@hapi/hapi'
 */
