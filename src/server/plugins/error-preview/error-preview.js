import { FormStatus } from '@defra/forms-engine-plugin/types'
import Boom from '@hapi/boom'

import { createErrorPreviewModel } from '~/src/server/plugins/error-preview/error-preview-helper.js'
import { getFormMetadataWithoutGuard } from '~/src/server/services/formMetadataGuards.js'
import { getFormDefinition } from '~/src/server/services/formsService.js'

/**
 * @param {FormRequest} request
 * @param {Pick<ResponseToolkit, 'redirect' | 'view'>} h
 */
export async function getErrorPreviewHandler(request, h) {
  const { params } = request
  const { slug, path, itemId } = params

  const metadata = await getFormMetadataWithoutGuard(slug)
  const definition = await getFormDefinition(metadata.id, FormStatus.Draft)
  if (!definition) {
    throw Boom.notFound(
      `No definition found for form metadata ${metadata.id} (${slug}) ${FormStatus.Draft}`
    )
  }

  return h.view(
    'error-preview',
    createErrorPreviewModel(definition, path, itemId ?? '')
  )
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { FormRequest } from '@defra/forms-engine-plugin/engine/types/index.js'
 */
