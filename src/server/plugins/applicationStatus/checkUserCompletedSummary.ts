import { type Request, type ResponseToolkit } from '@hapi/hapi'

import { extractFormInfoFromPath } from '../engine/plugin.js'

export async function checkUserCompletedSummary(
  request: Request,
  h: ResponseToolkit
) {
  const { cacheKey } = extractFormInfoFromPath(request)
  const model = request.server.app.models.get(cacheKey)

  const { cacheService } = request.services([])

  const state = await cacheService.getState(request)

  if (state.userCompletedSummary !== true) {
    request.logger.error(
      [`/${request.params.id}/status`],
      `${request.yar.id} user has incomplete state, redirecting to /summary`
    )

    return h.redirect(`${model.basePath}/summary`).takeover()
  }

  return state.userCompletedSummary
}
