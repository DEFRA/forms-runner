import { type Request, type Server } from '@hapi/hapi'
import { merge } from '@hapi/hoek'

import { config } from '~/src/config/index.js'
import { type createServer } from '~/src/server/index.js'
import { type ViewModel } from '~/src/server/plugins/engine/components/types.js'
import {
  type FormSubmissionState,
  type UploadInitiateResponse
} from '~/src/server/plugins/engine/types.js'

const partition = 'cache'

enum ADDITIONAL_IDENTIFIER {
  Confirmation = ':confirmation',
  Upload = ':upload'
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

  async getState(request: Request): Promise<FormSubmissionState> {
    const cached = await this.cache.get(this.Key(request))
    return cached || {}
  }

  async mergeState(request: Request, value: object) {
    const key = this.Key(request)
    const state = await this.getState(request)
    const ttl = config.get('sessionTimeout')

    merge(state, value, {
      mergeArrays: false
    })

    await this.cache.set(key, state, ttl)
    return this.cache.get(key)
  }

  async getConfirmationState(request: Request) {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Confirmation)
    return await this.cache.get(key)
  }

  async setConfirmationState(request: Request, viewModel: ViewModel) {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Confirmation)
    return this.cache.set(
      key,
      viewModel,
      config.get('confirmationSessionTimeout')
    )
  }

  async getUploadState(request: Request) {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Upload)
    const state = (await this.cache.get(key)) || {}

    return state[request.path]
  }

  async setUploadState(request: Request, value: UploadInitiateResponse) {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Upload)
    const state = (await this.cache.get(key)) || {}

    state[request.path] = value

    const ttl = config.get('sessionTimeout')
    await this.cache.set(key, state, ttl)
  }

  async clearState(request: Request) {
    if (request.yar.id) {
      await this.cache.drop(this.Key(request))
      await this.cache.drop(this.Key(request, ADDITIONAL_IDENTIFIER.Upload))
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
      id: `${request.yar.id}:${request.params.state ?? ''}:${request.params.slug ?? ''}:${additionalIdentifier ?? ''}`
    }
  }
}
