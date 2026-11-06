import { CITIZEN_SESSION } from '~/src/server/auth/scheme.js'

/** @type {RouteOptionsAccess} */
export const CITIZEN_AUTH_ROUTE_OPTIONS = {
  mode: 'required',
  strategy: CITIZEN_SESSION
}

/**
 * For a route that has a signed-in path and a signed-out path. A signed-out
 * citizen gets to the handler. Other auth failures go to the error page.
 * @type {RouteOptionsAccess}
 */
export const OPTIONAL_CITIZEN_AUTH_ROUTE_OPTIONS = {
  mode: 'optional',
  strategy: CITIZEN_SESSION
}

/**
 * @import { RouteOptionsAccess } from '@hapi/hapi'
 */
