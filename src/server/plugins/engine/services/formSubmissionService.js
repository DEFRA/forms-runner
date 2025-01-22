import { config } from '~/src/config/index.js'
import { postJson } from '~/src/server/services/httpService.js'

const submissionUrl = config.get('submissionUrl')

/**
 * Persist files by extending the time-to-live to 30 days
 * @param {{fileId: string, initiatedRetrievalKey: string}[]} files - batch of files to persist
 * @param {string} persistedRetrievalKey - final retrieval key when submitting
 */
export async function persistFiles(files, persistedRetrievalKey) {
  const postJsonByType = /** @type {typeof postJson<object>} */ (postJson)

  const payload = {
    files,
    persistedRetrievalKey
  }

  const result = await postJsonByType(`${submissionUrl}/files/persist`, {
    payload
  })

  return result
}

/**
 * Submit form
 * @param {SubmitPayload} data - submission data
 */
export async function submit(data) {
  const postJsonByType = /** @type {typeof postJson<SubmitResponsePayload>} */ (
    postJson
  )

  const payload = data

  const result = await postJsonByType(`${submissionUrl}/submit`, {
    payload
  })

  return result.payload
}

/**
 * @import { SubmitPayload, SubmitResponsePayload } from '@defra/forms-model'
 */
