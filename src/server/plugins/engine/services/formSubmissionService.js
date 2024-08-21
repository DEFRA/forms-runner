import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { postJson } from '~/src/server/services/httpService.js'

const submissionUrl = config.get('submissionUrl')
const logger = createLogger()

/**
 * Initiates a CDP file upload
 * @param {{fileId: string, initiatedRetrievalKey: string}[]} files - batch of files to persist
 * @param {string} persistedRetrievalKey - final retrieval key when submitting
 */
export async function persistFile(files, persistedRetrievalKey) {
  const postJsonByType = /** @type {typeof postJson} */ (postJson)

  const payload = {
    files,
    persistedRetrievalKey
  }

  logger.info(`Completed persistence request`)

  const result = await postJsonByType(`${submissionUrl}/files/persist`, {
    payload
  })

  logger.info(`Completed persistence request`)

  return result
}
