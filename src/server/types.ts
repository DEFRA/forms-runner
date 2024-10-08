/* eslint-disable @typescript-eslint/unified-signatures */

import { type ServerYar, type Yar } from '@hapi/yar'
import { type Logger } from 'pino'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type FileState } from '~/src/server/plugins/engine/types.js'
import { type CacheService } from '~/src/server/services/index.js'

export interface RouteConfig {
  formFileName?: string
  formFilePath?: string
  enforceCsrf?: boolean
}

declare module '@hapi/hapi' {
  // Here we are decorating Hapi interface types with
  // props from plugins which doesn't export @types
  interface Request {
    logger: Logger
    yar: Yar
  }

  interface RequestApplicationState {
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
