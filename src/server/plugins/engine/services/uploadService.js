import { config } from '~/src/config/index.js'
import { getJson, postJson } from '~/src/server/services/httpService.js'

const uploaderUrl = config.get('uploaderUrl')
const submissionUrl = config.get('submissionUrl')
const uploaderBucketName = config.get('uploaderBucketName')
const stagingPrefix = config.get('stagingPrefix')

/**
 * Initiates a CDP file upload
 * @param {string} path - the path of the page in the form
 * @param {string} retrievalKey - the retrieval key for the files
 * @param {string} [mimeTypesCsv] - the csv string of accepted mimeTypes
 */
export async function initiateUpload(path, retrievalKey, mimeTypesCsv) {
  const postJsonByType =
    /** @type {typeof postJson<UploadInitiateResponse>} */ (postJson)

  const mimeTypesList = mimeTypesCsv
    ?.split(',')
    .map((type) => type.trim())
    .filter((type) => type !== '')

  const mimeTypes = mimeTypesList?.length ? mimeTypesList : undefined

  const payload = {
    redirect: path,
    callback: `${submissionUrl}/file`,
    s3Bucket: uploaderBucketName,
    s3Path: stagingPrefix,
    metadata: {
      retrievalKey
    },
    mimeTypes
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
 * @import { UploadInitiateResponse, UploadStatusResponse } from '~/src/server/plugins/engine/types.js'
 */
