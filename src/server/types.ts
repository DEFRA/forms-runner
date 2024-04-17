import yar from '@hapi/yar'
import { Logger } from 'pino'

import { RateOptions } from './plugins/rateLimit.js'
import {
  CacheService,
  EmailService,
  NotifyService,
  PayService,
  StatusService,
  UploadService,
  WebhookService
} from './services/index.js'
import { QueueStatusService } from './services/queueStatusService.js'
import { QueueService } from './services/QueueService.js'

export type RouteConfig = {
  rateOptions?: RateOptions
  formFileName?: string
  formFilePath?: string
  enforceCsrf?: boolean
}

declare module '@hapi/hapi' {
  // Here we are decorating Hapi interface types with
  // props from plugins which doesn't export @types
  interface Request {
    i18n: {
      // plugin locale
      setLocale(lang: string): void
      getLocale(request: Request): void
      getDefaultLocale(): string
      getLocales(): string[]
    }
    logger: Logger
    yar: yar.Yar
  }

  interface Response {}

  interface Server {
    logger: Logger
    yar: yar.ServerYar
  }

  interface RequestApplicationState {
    location: string
  }
}

declare module '@hapipal/schmervice' {
  interface RegisteredServices {
    cacheService: CacheService
    emailService: EmailService
    notifyService: NotifyService
    payService: PayService
    uploadService: UploadService
    webhookService: WebhookService
    statusService: StatusService
    queueService: QueueService
    queueStatusService: QueueStatusService
  }

  interface SchmerviceDecorator {
    (all?: boolean): RegisteredServices
    (namespace?: string[]): RegisteredServices
  }
}
