import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { postJson } from '~/src/server/services/httpService.js'

const submissionUrl = config.get('submissionUrl')
const logger = createLogger()

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

  logger.info(`Completed persistence request for file ${fileId}`)

  const result = await postJsonByType(`${submissionUrl}/file/persist`, {
    payload
  })

  logger.info(`Completed persistence request for file ${fileId}`)
  return result
}
