/* eslint-disable no-console */

// Time in milliseconds before upload timeout (5 minutes)
const TIMEOUT_DURATION = 5000
// Time in milliseconds between status checks (2 seconds)
const STATUS_CHECK_INTERVAL = 1000
// Time in milliseconds before re-setting the page after an error (5 minutes)
const ERROR_RESET_DELAY = 300000

export function initFileUpload() {
  console.log(['FileUpload', 'init', 'starting'])

  const form = document.querySelector('form')
  if (!form) return

  /** @type {ReturnType<typeof setTimeout> | null} */
  let statusPollTimeout = null

  const fileInput = document.querySelector('input[type="file"]')
  if (!fileInput) {
    return
  }

  const uploadedFilesSections = document.querySelectorAll('.uploaded-files')
  if (uploadedFilesSections.length > 1) {
    for (let i = 1; i < uploadedFilesSections.length; i++) {
      uploadedFilesSections[i].remove()
    }
  }

  const htmlInput = /** @type {HTMLInputElement} */ (fileInput)
  const fileUploadName = htmlInput.id
  const errorSummary = document.querySelector('.govuk-error-summary-container')
  const manualReload = document.querySelector('.manual-reload')

  if (manualReload instanceof HTMLElement) {
    manualReload.style.display = 'none'
  }

  /**
   * @type {File | null}
   */
  let selectedFile = null

  htmlInput.addEventListener('change', () => {
    console.log([
      'FileUpload',
      'fileSelected',
      { name: htmlInput.files?.[0]?.name }
    ])
    clearError()
    if (!htmlInput.files || htmlInput.files.length === 0) return
    selectedFile = htmlInput.files[0]
  })

  const uploadBtn = document.querySelector('#upload-file-button')
  if (!uploadBtn) {
    return
  }
  /** @type {HTMLButtonElement} */
  const uploadButton = /** @type {HTMLButtonElement} */ (uploadBtn)

  // Override the type to prevent auto-submission
  uploadButton.setAttribute('type', 'button')

  // Handle the upload when the user clicks the "Upload file" button.
  uploadButton.addEventListener('click', (event) => {
    event.preventDefault()
    ;(async () => {
      if (!selectedFile) {
        console.log(['FileUpload', 'error', 'No file selected'])
        showError('No file selected')
        return
      }

      console.log([
        'FileUpload',
        'uploadStart',
        { filename: selectedFile.name }
      ])

      // Disable file input and button during upload
      disableInput()
      uploadButton.disabled = true

      // Move focus to the file input for screen reader notification
      htmlInput.focus()

      try {
        const initResponse = await fetch('/initiate-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename: selectedFile.name
          })
        })

        if (!initResponse.ok) {
          console.log([
            'FileUpload',
            'initError',
            { status: initResponse.status }
          ])
          throw new Error(`Failed to initiate upload: ${initResponse.status}`)
        }
        const initData = await initResponse.json()

        if (!initData.uploadUrl || !initData.uploadId) {
          throw new Error('Missing uploadUrl or uploadId in response')
        }

        const { uploadUrl, uploadId } = initData
        const formData = new FormData()
        formData.append('file', selectedFile)

        updateStatus('Uploading…', uploadId)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          controller.abort()
        }, TIMEOUT_DURATION)

        const onEscape = (/** @type {{ key: string; }} */ e) => {
          if (e.key === 'Escape') {
            controller.abort()
            clearTimeout(timeoutId)
            window.removeEventListener('keydown', onEscape)
          }
        }
        window.addEventListener('keydown', onEscape)

        try {
          const response = await fetchWithTimeout(uploadUrl, TIMEOUT_DURATION, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            redirect: 'follow', // allows redirects when using no-cors mode
            mode: 'no-cors', // prevents CORS errors by making request opaque
            signal: controller.signal
          })

          clearTimeout(timeoutId)
          window.removeEventListener('keydown', onEscape)

          // Even though our reverse proxy locally and our production environment usually prevent CORS issues,
          // we might still encounter an opaque (status 0) or a redirect (301/302/303) response. Such a response
          // indicates that the upload was accepted, even though we don't receive a standard 200 response.
          // We poll for the final upload status to confirm successful completion.
          if (
            response.status === 0 ||
            (response.status >= 300 && response.status < 400)
          ) {
            const checkStatus = async () => {
              console.log(['FileUpload', 'statusCheck', { uploadId }])

              const statusController = new AbortController()
              const statusTimeoutId = setTimeout(() => {
                statusController.abort()
              }, TIMEOUT_DURATION)

              try {
                const statusResponse = await fetch(
                  `/upload-status/${uploadId}`,
                  { signal: statusController.signal }
                )
                clearTimeout(statusTimeoutId)
                if (!statusResponse.ok) {
                  throw new Error('Failed to check upload status')
                }
                const status = await statusResponse.json()
                switch (status.uploadStatus) {
                  case 'initiated':
                    console.log([
                      'FileUpload',
                      'statusInitiated',
                      { uploadId, status: status.uploadStatus }
                    ])
                    updateStatus('Upload initiated...', uploadId)
                    statusPollTimeout = setTimeout(() => {
                      checkStatus()
                    }, STATUS_CHECK_INTERVAL)
                    break
                  case 'pending':
                    console.log([
                      'FileUpload',
                      'statusPending',
                      { uploadId, status: status.uploadStatus }
                    ])
                    updateStatus('Processing…', uploadId)
                    statusPollTimeout = setTimeout(() => {
                      checkStatus()
                    }, STATUS_CHECK_INTERVAL)
                    break
                  case 'ready': {
                    console.log([
                      'FileUpload',
                      'statusReady',
                      { uploadId, status: status.uploadStatus }
                    ])
                    const fileField = Object.values(status.form).find(
                      (field) =>
                        field &&
                        typeof field === 'object' &&
                        'fileStatus' in field
                    )
                    if (!fileField) {
                      throw new Error('No file data found in response')
                    }
                    if (
                      fileField.fileStatus === 'complete' &&
                      !fileField.hasError &&
                      fileField.s3Bucket &&
                      fileField.s3Key
                    ) {
                      updateStatus('Uploaded', uploadId)
                      enableInput()

                      console.log(
                        '🔍 updateStatus - upload complete with id:',
                        uploadId
                      )

                      const { state, slug, formPath } = getFormContext()
                      let basePath

                      if (state) {
                        basePath = `/preview/${state}/${slug}/${formPath}`
                      } else {
                        basePath = `/${slug}/${formPath}`
                      }

                      const endpointURL =
                        basePath +
                        '/upload/' +
                        encodeURIComponent(uploadId) +
                        '?basePath=' +
                        encodeURIComponent(basePath)

                      console.log(
                        'DEBUG: Constructed endpoint URL for PUT:',
                        endpointURL
                      )

                      await fetch(endpointURL, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json'
                        }
                      })
                        .then((response) => response.json())
                        .then((data) => {
                          console.log(
                            'Server state updated successfully:',
                            data
                          )
                        })
                        .catch((error) => {
                          console.error(
                            'Error updating file state on server:',
                            error
                          )
                        })
                    } else if (fileField.hasError) {
                      const errorMessage =
                        fileField.errorMessage ||
                        'There was a problem uploading your file'
                      showError(errorMessage)
                      handleUploadError(errorMessage)
                      throw new Error(errorMessage)
                    } else {
                      updateStatus('Processing…', uploadId)
                      statusPollTimeout = setTimeout(() => {
                        checkStatus()
                      }, STATUS_CHECK_INTERVAL)
                    }
                    break
                  }
                  case 'rejected': {
                    console.log([
                      'FileUpload',
                      'statusRejected',
                      { uploadId, error: status.errorMessage }
                    ])
                    const errorMessage =
                      status.errorMessage ||
                      'There was a problem uploading your file'
                    showError(errorMessage)
                    handleUploadError(errorMessage)
                    throw new Error(errorMessage)
                  }
                  default:
                    throw new Error('Unknown upload status')
                }
              } catch (error) {
                const errorMessage =
                  error instanceof Error
                    ? error.message
                    : 'There was a problem uploading your file'
                showError(errorMessage)
                handleUploadError(errorMessage)
              }
            }
            await checkStatus()
          } else if (!response.ok) {
            throw new Error(`Upload failed with status: ${response.status}`)
          }
        } catch (error) {
          console.log([
            'FileUpload',
            'error',
            {
              type: error instanceof Error ? error.name : 'Unknown',
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          ])
          // If the error was due to the user pressing Escape, we consider it a cancellation.
          if (error instanceof Error && error.name === 'AbortError') {
            resetUpload()
          } else {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'There was a problem uploading your file'
            showError(errorMessage)
            handleUploadError(errorMessage)
          }
        } finally {
          uploadButton.disabled = false
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'There was a problem uploading your file'
        showError(errorMessage)
        handleUploadError(errorMessage)
      }
    })()
  })

  function disableInput() {
    htmlInput.disabled = true
  }

  function enableInput() {
    htmlInput.disabled = false
  }

  let uploadedFilesCount = 0
  let totalFilesCount = 0

  /**
   * @param {number} bytes
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  /**
   * Updates the status display in the UI
   * @param {string} message - Status message to display
   * @param {string} uploadId - The upload ID for the remove link
   */
  function updateStatus(message, uploadId) {
    const statusDiv = document.querySelector('.file-upload-status .govuk-tag')
    if (statusDiv) {
      statusDiv.textContent = message
      statusDiv.classList.add('govuk-visually-hidden')
      statusDiv.id = 'upload-status'
      statusDiv.setAttribute('aria-live', 'polite')
    }

    if (message.includes('Upload')) {
      htmlInput.setAttribute('aria-describedby', 'upload-status')
    } else {
      htmlInput.removeAttribute('aria-describedby')
    }

    const container = document.querySelector('.govuk-summary-list-container')
    if (!container) {
      return
    }

    let summaryList = container.querySelector('.govuk-summary-list')
    if (!summaryList && selectedFile) {
      summaryList = document.createElement('dl')
      summaryList.className = 'govuk-summary-list govuk-summary-list--long-key'
      container.appendChild(summaryList)
    }

    if (summaryList && selectedFile) {
      let row = summaryList.querySelector(
        `[data-filename="${selectedFile.name}"]`
      )

      if (!row && uploadId) {
        totalFilesCount++
        if (message === 'Uploaded') {
          uploadedFilesCount++
        }

        row = document.createElement('div')
        row.className = 'govuk-summary-list__row'
        row.setAttribute('data-filename', selectedFile.name)
        row.setAttribute('data-upload-id', uploadId)

        const { state, slug, formPath } = getFormContext()
        const basePath = state
          ? `/preview/${state}/${slug}/${formPath}`
          : `/${slug}/${formPath}`
        const removeUrl = `${basePath}/${encodeURIComponent(uploadId)}/confirm-delete`

        const fileSize = formatFileSize(selectedFile.size)

        row.innerHTML = `
          <dt class="govuk-summary-list__key">
            ${selectedFile.name}
          </dt>
          <dd class="govuk-summary-list__value">
            ${fileSize}
            <strong class="govuk-tag ${getTagClass(message)} govuk-!-margin-left-4">${message}</strong>
          </dd>
          <dd class="govuk-summary-list__actions">
            ${
              uploadId && message === 'Uploaded'
                ? `<a href="${removeUrl}" 
                    class="govuk-link govuk-link--no-visited-state"
                    data-upload-id="${uploadId}">
                    Remove<span class="govuk-visually-hidden"> ${selectedFile.name}</span>
                   </a>
                   <input type="hidden" name="${fileUploadName}[]" value="${uploadId}">`
                : ''
            }
          </dd>
        `
        summaryList.appendChild(row)

        if (uploadId && message === 'Uploaded') {
          htmlInput.disabled = true
        }
      } else {
        const statusTag = row?.querySelector('.govuk-tag')
        if (statusTag) {
          const wasComplete = statusTag.classList.contains('govuk-tag--green')
          statusTag.textContent = message
          statusTag.className = `govuk-tag ${getTagClass(message)}`

          // Update count if status changed to/from complete
          if (!wasComplete && message === 'Uploaded') {
            uploadedFilesCount++
          } else if (wasComplete && message !== 'Uploaded') {
            uploadedFilesCount--
          }
        }

        if (uploadId && message === 'Uploaded') {
          const actionsCell = row?.querySelector('.govuk-summary-list__actions')
          if (actionsCell) {
            const { state, slug, formPath } = getFormContext()
            const basePath = state
              ? `/preview/${state}/${slug}/${formPath}`
              : `/${slug}/${formPath}`
            const removeUrl = `${basePath}/${encodeURIComponent(uploadId)}/confirm-delete`

            actionsCell.innerHTML = `
              <a href="${removeUrl}" 
                 class="govuk-link govuk-link--no-visited-state"
                 data-upload-id="${uploadId}">
                Remove<span class="govuk-visually-hidden"> ${selectedFile.name}</span>
              </a>
              <input type="hidden" name="${fileUploadName}" value="${uploadId}">
            `
          }
        }
      }

      // Update the count display
      const countDisplay = document.querySelector(
        'h2.govuk-heading-m + p.govuk-body'
      )
      if (countDisplay) {
        countDisplay.textContent = `${uploadedFilesCount} of ${totalFilesCount} files uploaded`
      }
    }
  }

  /**
   * @param {string} status
   */
  function getTagClass(status) {
    const tagClass = (() => {
      switch (status) {
        case 'Uploaded':
          return 'govuk-tag--green'
        case 'Uploading…':
        case 'Processing…':
        case 'Upload initiated...':
          return 'govuk-tag--yellow'
        default:
          return 'govuk-tag--red'
      }
    })()
    return tagClass
  }

  /**
   * @param {string} message
   */
  function showError(message) {
    if (errorSummary) {
      errorSummary.innerHTML = `
        <div class="govuk-error-summary" aria-labelledby="error-summary-title" role="alert">
          <h2 class="govuk-error-summary__title" id="error-summary-title">
            There is a problem
          </h2>
          <div class="govuk-error-summary__body">
            <ul class="govuk-list govuk-error-summary__list">
              <li>
                <a href="#file-upload">${message}</a>
              </li>
            </ul>
          </div>
        </div>
      `
      htmlInput.setAttribute('aria-describedby', 'error-summary-title')
    }

    const errorMessage = document.createElement('span')
    errorMessage.className = 'govuk-error-message'
    errorMessage.id = 'file-upload-error'
    errorMessage.innerHTML = `<span class="govuk-visually-hidden">Error:</span> ${message}`

    const formGroup = htmlInput.closest('.govuk-form-group')
    if (formGroup) {
      formGroup.classList.add('govuk-form-group--error')
      const existingError = formGroup.querySelector('.govuk-error-message')
      if (existingError) {
        existingError.remove()
      }
      htmlInput.parentNode?.insertBefore(errorMessage, htmlInput)
    }
  }

  function clearError() {
    if (errorSummary) {
      errorSummary.innerHTML = ''
      htmlInput.removeAttribute('aria-describedby')
    }

    const formGroup = htmlInput.closest('.govuk-form-group')
    if (formGroup) {
      formGroup.classList.remove('govuk-form-group--error')
      const errorMessage = formGroup.querySelector('.govuk-error-message')
      if (errorMessage) {
        errorMessage.remove()
      }
    }
  }

  function handleUploadError(
    errorMessage = 'The selected file could not be uploaded – try again.'
  ) {
    console.log([
      'FileUpload',
      'handleError',
      {
        filename: selectedFile?.name,
        error: errorMessage
      }
    ])
    const summaryList = document.querySelector('.govuk-summary-list')
    if (selectedFile && summaryList) {
      const fileRow = summaryList.querySelector(
        `[data-filename="${selectedFile.name}"]`
      )

      if (fileRow) {
        const errorContainer = document.createElement('div')
        errorContainer.className = 'govuk-summary-list__error-container'
        errorContainer.setAttribute('data-filename', selectedFile.name)

        fileRow.className = 'govuk-summary-list__row'
        const fileSize = formatFileSize(selectedFile.size)
        fileRow.innerHTML = `
          <dt class="govuk-summary-list__key">
            ${selectedFile.name}
          </dt>
          <dd class="govuk-summary-list__value">
            ${fileSize}
            <strong class="govuk-tag govuk-tag--red govuk-!-margin-left-4">Error</strong>
          </dd>
          <dd class="govuk-summary-list__actions">
            <a href="#" class="govuk-link govuk-link--no-visited-state">
              Remove<span class="govuk-visually-hidden"> ${selectedFile.name}</span>
            </a>
          </dd>
        `

        const errorRow = document.createElement('div')
        errorRow.className =
          'govuk-summary-list__row govuk-summary-list__row--error'
        errorRow.innerHTML = `
          <dd class="govuk-summary-list__value govuk-error-message" colspan="3">
            ${errorMessage}
          </dd>
        `

        fileRow.parentNode?.insertBefore(errorContainer, fileRow)
        errorContainer.appendChild(fileRow)
        errorContainer.appendChild(errorRow)

        const removeLink = fileRow.querySelector('.govuk-link')
        removeLink?.addEventListener('click', (e) => {
          e.preventDefault()
          errorContainer.remove()
          clearError()
          if (totalFilesCount > 0) totalFilesCount--
          updateCountDisplay()
          htmlInput.value = ''
          selectedFile = null
        })
      }
    }

    enableInput()
    htmlInput.focus()

    if (statusPollTimeout) {
      clearTimeout(statusPollTimeout)
    }

    updateCountDisplay()

    setTimeout(() => {
      resetUpload()
      const errorContainers = document.querySelectorAll(
        '.govuk-summary-list__error-container'
      )
      errorContainers.forEach((container) => container.remove())
      clearError()
    }, ERROR_RESET_DELAY)
  }

  function updateCountDisplay() {
    const countDisplay = document.querySelector(
      'h2.govuk-heading-m + p.govuk-body'
    )
    if (countDisplay) {
      countDisplay.textContent = `${uploadedFilesCount} of ${totalFilesCount} files uploaded`
    }
  }

  function resetUpload() {
    console.log([
      'FileUpload',
      'reset',
      {
        filename: selectedFile?.name
      }
    ])
    clearError()
    updateStatus('', '')

    const statusDiv = document.querySelector('.file-upload-status .govuk-tag')
    if (statusDiv) {
      statusDiv.classList.add('govuk-visually-hidden')
    }

    enableInput()
    if (fileInput instanceof HTMLInputElement) {
      fileInput.value = ''
    }
    htmlInput.removeAttribute('aria-describedby')

    if (statusPollTimeout) {
      clearTimeout(statusPollTimeout)
    }

    if (selectedFile) {
      const summaryList = document.querySelector('.govuk-summary-list')
      if (summaryList) {
        const fileRow = summaryList.querySelector(
          `[data-filename="${selectedFile.name}"]`
        )
        if (fileRow) {
          fileRow.remove()
        }
      }
      selectedFile = null
    }

    if (totalFilesCount > 0) totalFilesCount--
    if (uploadedFilesCount > 0) uploadedFilesCount--

    const countDisplay = document.querySelector(
      'h2.govuk-heading-m + p.govuk-body'
    )
    if (countDisplay) {
      countDisplay.textContent = `${uploadedFilesCount} of ${totalFilesCount} files uploaded`
    }
  }

  window.addEventListener('pageshow', () => {
    const hasUploaded = document.querySelector(
      '.govuk-summary-list .govuk-tag.govuk-tag--green'
    )
    if (!hasUploaded) {
      resetUpload()
    }
  })

  // /**
  //  * @param {Element | null} row
  //  * @param {Element} removeLink
  //  */
  // function createConfirmDeleteDialog(row, removeLink) {
  //   const dialog = document.createElement('div')
  //   dialog.className = 'govuk-grid-row'
  //   dialog.innerHTML = `
  //     <div class="govuk-grid-column-two-thirds">
  //       <h1 class="govuk-heading-l">Are you sure you want to remove this file?</h1>
  //       <p class="govuk-body govuk-!-margin-bottom-6">You cannot recover removed files.</p>
  //       <div class="govuk-button-group">
  //         <button type="button" class="govuk-button govuk-button--warning" data-confirm="yes">Remove file</button>
  //         <a href="#" class="govuk-link" data-confirm="no">Cancel</a>
  //       </div>
  //     </div>
  //   `

  //   dialog
  //     .querySelector('[data-confirm="yes"]')
  //     ?.addEventListener('click', (e) => {
  //       e.preventDefault()
  //       ;(async () => {
  //         const uploadId = removeLink.getAttribute('data-upload-id')
  //         if (!uploadId) return
  //         try {
  //           const { state, slug, formPath } = getFormContext()
  //           let basePath
  //           if (state) {
  //             basePath = `/preview/${state}/${slug}/${formPath}`
  //           } else {
  //             basePath = `/${slug}/${formPath}`
  //           }

  //           const endpointURL =
  //             basePath +
  //             '/upload/' +
  //             encodeURIComponent(uploadId) +
  //             '?basePath=' +
  //             encodeURIComponent(basePath)

  //           console.log(
  //             'DEBUG: Constructed endpoint URL for DELETE:',
  //             endpointURL
  //           )

  //           // Call the DELETE endpoint
  //           const response = await fetch(endpointURL, {
  //             method: 'DELETE',
  //             headers: { 'Content-Type': 'application/json' }
  //           })

  //           // Check for a valid 200 response
  //           if (!response.ok) {
  //             throw new Error(`Remove failed: ${response.status}`)
  //           }

  //           // If desired, you can parse the JSON response:
  //           const resData = await response.json()
  //           console.log('File removal successful:', resData)

  //           // Remove the file row from the UI and adjust the counters
  //           row?.remove()
  //           uploadedFilesCount--
  //           totalFilesCount--
  //           updateCountDisplay()

  //           // Remove the confirmation dialog
  //           dialog.remove()

  //           // Re-enable input if needed
  //           enableInput()
  //         } catch (error) {
  //           console.error('Error removing file:', error)
  //         }
  //       })()
  //     })

  //   dialog
  //     .querySelector('[data-confirm="no"]')
  //     ?.addEventListener('click', (e) => {
  //       e.preventDefault()
  //       dialog.remove()
  //     })

  //   return dialog
  // }

  /*
const container = document.querySelector('.govuk-summary-list-container')
if (container) {
  container.addEventListener('click', (event) => {
    const clicked = event.target
    if (!(clicked instanceof HTMLElement)) return

    const removeLink = clicked.closest('a.govuk-link--no-visited-state')
    if (!removeLink) return

    const uploadId = removeLink.getAttribute('data-upload-id')
    if (!uploadId) {
      return
    }

    event.preventDefault()
    const row = removeLink.closest('.govuk-summary-list__row')
    const dialog = createConfirmDeleteDialog(row, removeLink)
    container.insertBefore(dialog, container.firstChild)
  })
}
*/
}

export default initFileUpload

/**
 * Fetch helper with timeout functionality.
 * @param {string} url The endpoint URL.
 * @param {number} timeoutDuration Timeout duration in milliseconds.
 * @param {RequestInit} [options] The fetch options.
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, timeoutDuration, options = {}) {
  /**
   * @type {AbortController}
   */
  let controller
  if (!options.signal) {
    controller = new AbortController()
    options.signal = controller.signal
  }

  // timeout promise that will reject after the given duration.
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutDuration)

  const fetchPromise = fetch(url, options)
    .then((response) => {
      return response
    })
    .catch((error) => {
      throw error
    })

  // Race the fetch against the timeout.
  // Clear the timeout if fetch resolves before timing out.
  return Promise.race([
    fetchPromise.finally(() => clearTimeout(timeoutId)),
    new Promise((resolve, reject) =>
      setTimeout(() => reject(new Error('Upload timed out')), timeoutDuration)
    )
  ])
}

function getFormContext() {
  const segments = window.location.pathname.split('/').filter(Boolean)
  let state, slug, formPath
  if (segments[0] === 'preview') {
    state = segments[1]
    slug = segments[2]
    formPath = segments.slice(3).join('/')
  } else {
    slug = segments[0] || ''
    formPath = segments.slice(1).join('/') || ''
  }
  console.log('DEBUG: getFormContext =>', { state, slug, formPath })
  return { state, slug, formPath }
}
