import Boom from '@hapi/boom'

import {
  getFormDefinition,
  getFormMetadata
} from '~/src/server/plugins/engine/services/formsService.js'
import { createErrorPreviewModel } from '~/src/server/plugins/error-preview/error-preview-helper.js'
import { FormStatus } from '~/src/server/routes/types.js'

/**
 * @param {FormRequest} request
 * @param {Pick<ResponseToolkit, 'redirect' | 'view'>} h
 */
export async function getErrorPreviewHandler(request, h) {
  const { params } = request
  const { slug, path, itemId } = params

  // Get the form metadata using the `slug` param
  const metadata = await getFormMetadata(slug)

  // Get the form definition using the `id` from the metadata
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
 * @import { FormRequest } from '~/src/server/routes/types.js'
 */
