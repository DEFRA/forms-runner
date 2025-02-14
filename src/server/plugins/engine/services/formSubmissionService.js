import { config } from '~/src/config/index.js'
import { postJson } from '~/src/server/services/httpService.js'
const submissionUrl = config.get('submissionUrl')

/**
 * Persist files by extending the time-to-live to 30 days
 * @param {FilePersistData[]} files Files to persist.
 * @param {string} retrievalKey Final retrieval key when submitting (usually the output email).
 * @returns {Promise<object>} The result payload.
 */
export async function persistFiles(files, retrievalKey) {
  const postJsonByType = /** @type {typeof postJson<object>} */ (postJson)

  const payload = {
    retrievalKey,
    files
  }

  const result = await postJsonByType(`${submissionUrl}/files/persist`, {
    payload
  })

  return result
}

/**
 * Extend the retention time for uploaded files.
 * @param {FilePersistData[]} files Array of file objects.
 * @param {string} retrievalKey The key (usually the user's email) to be used for persistence.
 * @returns {Promise<object>} The result payload.
 */
export async function extendFileRetention(files, retrievalKey) {
  const payload = {
    retrievalKey,
    files
  }
  const result = await postJson(`${submissionUrl}/file/extend`, { payload })
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

/**
 * @import { FilePersistData } from '~/src/server/plugins/engine/services/types.js'
 */
