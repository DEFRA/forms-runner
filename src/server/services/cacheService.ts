import { Engine as MemoryEngine } from '@hapi/catbox-memory'
import { Engine as RedisEngine } from '@hapi/catbox-redis'
import { type Request, type Server } from '@hapi/hapi'
import { token } from '@hapi/jwt'
import { merge } from 'hoek'
import Redis from 'ioredis'

import config from '~/src/server/config.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'
import {
  type DecodedSessionToken,
  type InitialiseSessionOptions
} from '~/src/server/plugins/initialiseSession/types.js'
import { type WebhookSchema } from '~/src/server/schemas/types.js'

const {
  redisHost,
  redisPort,
  redisPassword,
  redisTls,
  isSandbox,
  sessionTimeout,
  confirmationSessionTimeout,
  paymentSessionTimeout
} = config
const partition = 'cache'

enum ADDITIONAL_IDENTIFIER {
  Confirmation = ':confirmation'
}

export class CacheService {
  /**
   * This service is responsible for getting, storing or deleting a user's session data in the cache. This service has been registered by {@link createServer}
   */
  cache: any
  logger: Server['logger']

  constructor(server: Server) {
    this.cache = server.cache({ segment: 'cache' })
    this.logger = server.logger
  }

  async getState(request: Request): Promise<FormSubmissionState> {
    const cached = await this.cache.get(this.Key(request))
    return cached || {}
  }

  async mergeState(
    request: Request,
    value: object,
    nullOverride = true,
    arrayMerge = false
  ) {
    const key = this.Key(request)
    const state = await this.getState(request)
    let ttl = sessionTimeout
    merge(state, value, nullOverride, arrayMerge)
    if (state.pay) {
      this.logger.info(
        ['cacheService', request.yar.id],
        `Pay state detected setting session TTL to ${paymentSessionTimeout}.`
      )
      ttl = paymentSessionTimeout
    }
    await this.cache.set(key, state, ttl)
    return this.cache.get(key)
  }

  async getConfirmationState(request: Request) {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Confirmation)
    return await this.cache.get(key)
  }

  async setConfirmationState(request: Request, viewModel) {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Confirmation)
    return this.cache.set(key, viewModel, confirmationSessionTimeout)
  }

  async createSession(
    jwt: string,
    data: {
      callback: InitialiseSessionOptions
    } & Partial<WebhookSchema>
  ) {
    return this.cache.set(
      this.JWTKey(jwt),
      data,
      config.initialisedSessionTimeout
    )
  }

  async activateSession(jwt, request) {
    const { decoded } = token.decode(jwt)
    const { payload }: { payload: DecodedSessionToken } = decoded

    const userSessionKey = {
      segment: partition,
      id: `${request.yar.id}:${payload.group}`
    }

    const initialisedSession = await this.cache.get(this.JWTKey(jwt))

    const currentSession = await this.cache.get(userSessionKey)
    const mergedSession = {
      ...currentSession,
      ...initialisedSession
    }
    this.cache.set(userSessionKey, mergedSession, sessionTimeout)
    await this.cache.drop(this.JWTKey(jwt))
    return {
      redirectPath: initialisedSession?.callback?.redirectPath ?? ''
    }
  }

  async clearState(request: Request) {
    if (request.yar.id) {
      this.cache.drop(this.Key(request))
    }
  }

  /**
   * The key used to store user session data against.
   * If there are multiple forms on the same runner instance, for example `form-a` and `form-a-feedback` this will prevent CacheService from clearing data from `form-a` if a user gave feedback before they finished `form-a`
   * @param request - hapi request object
   * @param additionalIdentifier - appended to the id
   */
  Key(request: Request, additionalIdentifier?: ADDITIONAL_IDENTIFIER) {
    if (!request.yar.id) {
      throw Error('No session ID found')
    }
    return {
      segment: partition,
      id: `${request.yar.id}:${request.params.id}${additionalIdentifier ?? ''}`
    }
  }

  JWTKey(jwt) {
    return {
      segment: partition,
      id: jwt
    }
  }
}

export const catboxProvider = () => {
  /**
   * If redisHost doesn't exist, CatboxMemory will be used instead.
   * More information at {@link https://hapi.dev/module/catbox/api}
   */
  const provider = {
    constructor: redisHost ? RedisEngine : MemoryEngine,
    options: {}
  }

  if (redisHost) {
    const redisOptions: {
      password?: string
      tls?: object
    } = {}

    if (redisPassword) {
      redisOptions.password = redisPassword
    }

    if (redisTls) {
      redisOptions.tls = {}
    }

    const client = isSandbox
      ? new Redis({ host: redisHost, port: redisPort, password: redisPassword })
      : new Redis.Cluster(
          [
            {
              host: redisHost,
              port: redisPort
            }
          ],
          {
            dnsLookup: (address, callback) => callback(null, address, 4),
            redisOptions
          }
        )
    provider.options = { client, partition }
  } else {
    provider.options = { partition }
  }

  return provider
}
