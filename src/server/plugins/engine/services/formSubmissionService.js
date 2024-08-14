import { config } from '~/src/config/index.js'
import { getJson, postJson } from '~/src/server/services/httpService.js'

const submissionUrl = config.get('submissionUrl')

/**
 * Initiates a CDP file upload
 * @param {string} fileId - the ID of the file
 * @param {string} initiatedRetrievalKey - retrieval key when initiating upload
 * @param {string} persistedRetrievalKey - final retrieval key when submitting
 */
export async function persistFile(
  fileId,
  initiatedRetrievalKey,
  persistedRetrievalKey
) {
  const postJsonByType = /** @type {typeof postJson} */ (postJson)

  const payload = {
    fileId,
    initiatedRetrievalKey,
    persistedRetrievalKey
  }

  return postJsonByType(`${submissionUrl}/file/persist`, { payload })
}
