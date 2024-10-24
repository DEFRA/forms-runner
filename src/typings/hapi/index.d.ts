/* eslint-disable @typescript-eslint/unified-signatures */

import { type FormMetadata } from '@defra/forms-model'
import { type Plugin } from '@hapi/hapi'
import { type ServerYar, type Yar } from '@hapi/yar'
import { type Logger } from 'pino'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type FileState,
  type FormData
} from '~/src/server/plugins/engine/types.js'
import { type CacheService } from '~/src/server/services/index.js'

declare module '@hapi/hapi' {
  // Here we are decorating Hapi interface types with
  // props from plugins which doesn't export @types
  interface PluginProperties {
    crumb: {
      generate?: (request: Request, h: ResponseToolkit) => void
    }
  }

  interface Request {
    logger: Logger
    yar: Yar
  }

  interface RequestApplicationState {
    metadata?: FormMetadata
    model?: FormModel
    files?: FileState[]
    formAction?: string
    repeat?: {
      list: FormData[]
      item?: {
        value: FormData
        index: number
      }
    }
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
    plugin: Plugin<Record<string, boolean | string[]>>
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
