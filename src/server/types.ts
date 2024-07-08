import { type ServerYar, type Yar } from '@hapi/yar'
import { type Logger } from 'pino'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type RateOptions } from '~/src/server/plugins/rateLimit.js'
import { type CacheService } from '~/src/server/services/index.js'

export interface RouteConfig {
  rateOptions?: RateOptions
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
