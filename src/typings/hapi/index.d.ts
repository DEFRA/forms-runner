/* eslint-disable @typescript-eslint/unified-signatures */

import { type FormModel } from '@defra/forms-engine-plugin/engine/models/index.js'
import { type Plugin } from '@hapi/hapi'
import { type ServerYar, type Yar } from '@hapi/yar'
import { type Configuration } from 'openid-client'
import { type Logger } from 'pino'

import { type SAVE_AND_EXIT_PAYLOAD } from '~/src/server/constants.js'
import { type CacheService } from '~/src/server/services/index.js'

declare module '@hapi/hapi' {
  // Here we are decorating Hapi interface types with
  // props from plugins which doesn't export @types

  // The citizen-session scheme puts the signed-in identity straight on
  // request.auth.credentials, so this is the credentials shape for every
  // authenticated request in the app.
  interface AuthCredentials {
    iss?: string
    sub?: string
    email?: string
    idToken?: string
  }

  interface PluginProperties {
    crumb: {
      generate?: (request: Request) => string
    }
  }

  interface PluginsStates {
    blankie?: {
      nonces?: {
        script?: string
        style?: string
      }
    }
  }

  interface Request {
    logger: Logger
    yar: Yar
  }

  interface RequestApplicationState {
    model?: FormModel
    language?: string
  }

  interface Server {
    logger: Logger
    yar: ServerYar
  }

  interface ServerApplicationState {
    model?: FormModel
    models: Map<string, { model: FormModel; updatedAt: Date }>
    oidc: {
      getConfig: () => Promise<Configuration>
    }
  }
}

declare module '@hapipal/schmervice' {
  interface RegisteredServices {
    cacheService: CacheService
  }

  interface SchmerviceDecorator {
    (all?: boolean): RegisteredServices
    (namespace?: string[]): RegisteredServices
  }
}

declare module '@hapi/scooter' {
  declare const hapiScooter: {
    plugin: Plugin
  }

  export = hapiScooter
}

declare module 'blankie' {
  declare const blankie: {
    plugin: Plugin<Record<string, boolean | string | string[]>>
  }

  export = blankie
}

declare module 'blipp' {
  declare const blipp: {
    plugin: Plugin
  }

  export = blipp
}

declare module 'hapi-pulse' {
  declare const hapiPulse: {
    plugin: Plugin<{
      timeout: number
    }>
  }

  export = hapiPulse
}

declare module '@hapi/yar' {
  interface YarFlashes {
    [SAVE_AND_EXIT_PAYLOAD]: object
  }

  interface YarValues {
    citizen: {
      iss: string
      sub: string
      email: string
      idToken: string
    }
    'oidc:tx': {
      state: string
      nonce: string
      codeVerifier: string
      returnTo: string
    }
    'auth:signedOutFrom': string
  }
}
