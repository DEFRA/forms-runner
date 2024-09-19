import { type Request } from '@hapi/hapi'

import { getUploadStatus } from '../plugins/engine/services/uploadService.js'

export default {
  method: 'GET',
  path: '/file-upload-status/{id}',
  async handler(request: Request) {
    const { params } = request
    const { id } = params

    return await getUploadStatus(id as string)
  }
}
