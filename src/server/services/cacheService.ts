import { type Request, type Server } from '@hapi/hapi'
import { merge } from '@hapi/hoek'

import { config } from '~/src/config/index.js'
import { type createServer } from '~/src/server/index.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

const partition = 'cache'

enum ADDITIONAL_IDENTIFIER {
  Confirmation = ':confirmation'
}

export class CacheService {
  /**
   * This service is responsible for getting, storing or deleting a user's session data in the cache. This service has been registered by {@link createServer}
   */
  cache
  logger: Server['logger']

  constructor(server: Server) {
    this.cache = server.cache({ cache: 'session', segment: 'formSubmission' })
    this.logger = server.logger
  }

  async getState(
    request: Request | FormRequest | FormRequestPayload
  ): Promise<FormSubmissionState> {
    const cached = await this.cache.get(this.Key(request))

    return cached || {}
  }

  async mergeState(request: FormRequest | FormRequestPayload, value: object) {
    const key = this.Key(request)
    const state = await this.getState(request)
    const ttl = config.get('sessionTimeout')

    merge(state, value, {
      mergeArrays: false
    })

    await this.cache.set(key, state, ttl)

    return this.getState(request)
  }

  async getConfirmationState(
    request: FormRequest | FormRequestPayload
  ): Promise<{ confirmed?: true }> {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Confirmation)
    const value = await this.cache.get(key)

    return value || {}
  }

  async setConfirmationState(
    request: FormRequest | FormRequestPayload,
    confirmationState: { confirmed?: true }
  ) {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Confirmation)
    const ttl = config.get('confirmationSessionTimeout')

    return this.cache.set(key, confirmationState, ttl)
  }

  async clearState(request: FormRequest | FormRequestPayload) {
    if (request.yar.id) {
      await this.cache.drop(this.Key(request))
    }
  }

  /**
   * The key used to store user session data against.
   * If there are multiple forms on the same runner instance, for example `form-a` and `form-a-feedback` this will prevent CacheService from clearing data from `form-a` if a user gave feedback before they finished `form-a`
   * @param request - hapi request object
   * @param additionalIdentifier - appended to the id
   */
  Key(
    request: Request | FormRequest | FormRequestPayload,
    additionalIdentifier?: ADDITIONAL_IDENTIFIER
  ) {
    if (!request.yar.id) {
      throw Error('No session ID found')
    }
    return {
      segment: partition,
      id: `${request.yar.id}:${request.params.state ?? ''}:${request.params.slug ?? ''}:${additionalIdentifier ?? ''}`
    }
  }
}
