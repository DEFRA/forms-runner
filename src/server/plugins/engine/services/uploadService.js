import { config } from '~/src/config/index.js'
import { getJson, postJson } from '~/src/server/services/httpService.js'

const uploaderUrl = config.get('uploaderUrl')
const submissionUrl = config.get('submissionUrl')
const uploaderBucketName = config.get('uploaderBucketName')
const stagingPrefix = config.get('stagingPrefix')

/**
 * Transforms an uploader URL to use the configured host/protocol
 * Mainly used for local dev reverse proxy setup
 * @param {string} originalUrl - The original URL.
 * @returns {string} - The transformed URL.
 */
function transformUploaderUrl(originalUrl) {
  const configuredUrl = new URL(uploaderUrl)
  const urlObj = new URL(originalUrl)
  urlObj.protocol = configuredUrl.protocol
  urlObj.host = configuredUrl.host
  return urlObj.toString()
}

/**
 * Initiates a CDP file upload
 * @param {string} path - the path of the page in the form
 * @param {string} retrievalKey - the retrieval key for the files
 * @param {string} [mimeTypes] - the CSV string of accepted mimeTypes
 * @param {string} [redirectUrl] - the redirect URL, derived from the request headers
 */
export async function initiateUpload(
  path,
  retrievalKey,
  mimeTypes,
  redirectUrl = ''
) {
  const postJsonByType =
    /** @type {typeof postJson<UploadInitiateResponse>} */ (postJson)

  const payload = {
    redirect: redirectUrl,
    callback: `${submissionUrl}/file`,
    s3Bucket: uploaderBucketName,
    s3Path: stagingPrefix,
    metadata: {
      retrievalKey
    },
    mimeTypes: mimeTypes
      ?.split(',')
      .map((type) => type.trim())
      .filter((type) => type !== '')
    // maxFileSize: 25 * 1000 * 1000
  }

  const { payload: initiate } = await postJsonByType(
    `${uploaderUrl}/initiate`,
    { payload }
  )

  if (!initiate?.uploadId || !initiate.uploadUrl || !initiate.statusUrl) {
    throw new Error('Missing required upload response fields')
  }

  const transformedInitiate = {
    uploadId: initiate.uploadId,
    uploadUrl: transformUploaderUrl(initiate.uploadUrl),
    statusUrl: transformUploaderUrl(initiate.statusUrl)
  }

  return transformedInitiate
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
