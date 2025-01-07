/* eslint-disable @typescript-eslint/unified-signatures */

import { type Plugin } from '@hapi/hapi'
import { type ServerYar, type Yar } from '@hapi/yar'
import { type Logger } from 'pino'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'
import { type CacheService } from '~/src/server/services/index.js'

declare module '@hapi/hapi' {
  // Here we are decorating Hapi interface types with
  // props from plugins which doesn't export @types
  interface PluginProperties {
    crumb: {
      generate?: (request: Request | FormRequest | FormRequestPayload) => string
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
  }

  interface Server {
    logger: Logger
    yar: ServerYar
  }

  interface ServerApplicationState {
    model?: FormModel
    models: Map<string, { model: FormModel; updatedAt: Date }>
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
