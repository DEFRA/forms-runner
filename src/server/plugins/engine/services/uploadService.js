import { config } from '~/src/config/index.js'
import { getJson, postJson } from '~/src/server/services/httpService.js'

const uploaderUrl = config.get('uploaderUrl')
const submissionUrl = config.get('submissionUrl')
const uploaderBucketName = config.get('uploaderBucketName')

/**
 * Initiates a CDP file upload
 * @param {string} formId - the ID of the form
 * @param {string} path - the path of the page in the form
 * @param {string} retrievalKey - the retrieval key for the files
 */
export async function initiateUpload(formId, path, retrievalKey) {
  const postJsonByType =
    /** @type {typeof postJson<UploadInitiateResponse>} */ (postJson)

  const payload = {
    redirect: path,
    callback: `${submissionUrl}/file`,
    s3Bucket: uploaderBucketName,
    metadata: {
      formId,
      path,
      retrievalKey
    }
    // maxFileSize: 25 * 1000 * 1000
  }

  const { payload: initiate } = await postJsonByType(
    `${uploaderUrl}/initiate`,
    { payload }
  )

  return initiate
}

/**
 * Get the status of a CDP file upload
 * @param {string} uploadId - the ID of the upload
 */
export async function getUploadStatus(uploadId) {
  const getJsonByType = /** @type {typeof getJson<UploadStatusResponse>} */ (
    getJson
  )

  const { payload: status } = await getJsonByType(
    `${uploaderUrl}/status/${uploadId}`
  )

  return status
}

/**
 * @typedef {import('~/src/server/plugins/engine/types.js').UploadInitiateResponse} UploadInitiateResponse
 * @typedef {import('~/src/server/plugins/engine/types.js').UploadStatusResponse} UploadStatusResponse
 */
