export const MAX_POLLING_DURATION = 300 // 5 minutes
const ARIA_DESCRIBEDBY = 'aria-describedby'
const ERROR_SUMMARY_TITLE_ID = 'error-summary-title'

/**
 * Creates or updates status announcer for screen readers
 * @param {HTMLElement | null} form - The form element
 * @param {HTMLElement | null} fileCountP - The file count paragraph element
 * @returns {HTMLElement} The status announcer element
 */
function createOrUpdateStatusAnnouncer(form, fileCountP) {
  let statusAnnouncer = form?.querySelector('#statusInformation')

  if (!statusAnnouncer) {
    statusAnnouncer = document.createElement('div')
    statusAnnouncer.id = 'statusInformation'
    statusAnnouncer.className = 'govuk-visually-hidden'
    statusAnnouncer.setAttribute('aria-live', 'polite')

    // multiple fallbacks to ensure the status announcer is always added to the DOM
    // this helps with cross-browser compatibility and unexpected DOM structures encountered during QA
    try {
      addStatusAnnouncerToDOM(
        asHTMLElement(form),
        asHTMLElement(fileCountP),
        asHTMLElement(statusAnnouncer)
      )
    } catch {
      try {
        form?.appendChild(statusAnnouncer)
      } catch {
        document.body.appendChild(statusAnnouncer)
      }
    }
  }

  return /** @type {HTMLElement} */ (statusAnnouncer)
}

/**
 * Helper function to add the status announcer to the DOM
 * @param {HTMLElement} form - The form element
 * @param {HTMLElement | null} fileCountP - The file count paragraph element
 * @param {HTMLElement} statusAnnouncer - The status announcer element to add
 */
function addStatusAnnouncerToDOM(form, fileCountP, statusAnnouncer) {
  if (fileCountP?.nextSibling && fileCountP.parentNode === form) {
    form.insertBefore(statusAnnouncer, fileCountP.nextSibling)
    return
  }

  const parentElement = fileCountP?.parentNode ?? form
  parentElement.appendChild(statusAnnouncer)
}

/**
 * Finds an existing summary list or creates a new one
 * @param {HTMLFormElement} form - The form element
 * @param {HTMLElement} fileCountP - The file count paragraph element
 * @returns {HTMLElement} The summary list element
 */
function findOrCreateSummaryList(form, fileCountP) {
  let summaryList = form.querySelector('dl.govuk-summary-list')

  if (!summaryList) {
    summaryList = document.createElement('dl')
    summaryList.className = 'govuk-summary-list govuk-summary-list--long-key'

    const continueButton = form.querySelector('.govuk-button')

    if (continueButton) {
      form.insertBefore(summaryList, continueButton)
    } else {
      form.insertBefore(summaryList, fileCountP.nextSibling)
    }
  }

  return /** @type {HTMLElement} */ (summaryList)
}

/**
 * Creates a file row element for the summary list
 * @param {File | null} selectedFile - The selected file
 * @param {string} statusText - The status to display
 * @returns {HTMLElement} The created row element
 */
function createFileRow(selectedFile, statusText) {
  const row = document.createElement('div')
  row.className = 'govuk-summary-list__row'
  row.setAttribute('data-filename', selectedFile?.name ?? '')
  row.innerHTML = `
      <dt class="govuk-summary-list__key">
        ${selectedFile?.name ?? ''}
      </dt>
      <dd class="govuk-summary-list__value">
        <strong class="govuk-tag govuk-tag--yellow">${statusText}</strong>
      </dd>
      <dd class="govuk-summary-list__actions">
      </dd>
    `
  return row
}

/**
 * Renders or updates the file summary box for the selected file
 * @param {File | null} selectedFile - The selected file
 * @param {string} statusText - The status to display
 * @param {HTMLElement} form - The form element
 */
function renderSummary(selectedFile, statusText, form) {
  const container = document.getElementById('uploadedFilesContainer')
  const uploadForm = container ? container.closest('form') : null

  if (!uploadForm || !(uploadForm instanceof HTMLFormElement)) {
    return
  }

  const fileCountP = uploadForm.querySelector('p.govuk-body')

  if (!fileCountP) {
    return
  }

  const statusAnnouncer = createOrUpdateStatusAnnouncer(
    /** @type {HTMLElement} */ (uploadForm),
    /** @type {HTMLElement | null} */ (fileCountP)
  )

  const fileInput = form.querySelector('input[type="file"]')

  if (fileInput) {
    fileInput.setAttribute(ARIA_DESCRIBEDBY, 'statusInformation')
  }

  const summaryList = findOrCreateSummaryList(
    /** @type {HTMLFormElement} */ (uploadForm),
    /** @type {HTMLElement} */ (fileCountP)
  )

  const existingRow = document.querySelector(
    `[data-filename="${selectedFile?.name}"]`
  )

  if (existingRow) {
    existingRow.remove()
  }

  const row = createFileRow(selectedFile, statusText)
  summaryList.insertBefore(row, summaryList.firstChild)
  statusAnnouncer.textContent = `${selectedFile?.name ?? ''} ${statusText}`
}

/**
 * Shows an error message using the GOV.UK error summary component
 * and adds inline error styling to the file input
 * @param {string} message - The error message to display
 * @param {HTMLElement | null} errorSummary - The error summary container
 * @param {HTMLInputElement} fileInput - The file input element
 * @returns {void}
 */
function showError(message, errorSummary, fileInput) {
  const topErrorSummary = document.querySelector('.govuk-error-summary')

  if (topErrorSummary) {
    const titleElement = document.getElementById(ERROR_SUMMARY_TITLE_ID)
    if (titleElement) {
      fileInput.setAttribute(ARIA_DESCRIBEDBY, ERROR_SUMMARY_TITLE_ID)
    } else {
      fileInput.removeAttribute(ARIA_DESCRIBEDBY)
    }
    return
  }

  if (errorSummary) {
    errorSummary.innerHTML = `
        <div class="govuk-error-summary" data-module="govuk-error-summary">
          <div role="alert">
            <h2 class="govuk-error-summary__title" id="${ERROR_SUMMARY_TITLE_ID}">
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
        </div>
      `

    fileInput.setAttribute(ARIA_DESCRIBEDBY, ERROR_SUMMARY_TITLE_ID)
  }

  const formGroup = fileInput.closest('.govuk-form-group')
  if (formGroup) {
    formGroup.classList.add('govuk-form-group--error')
    fileInput.classList.add('govuk-file-upload--error')

    const inputId = fileInput.id
    let errorMessage = document.getElementById(`${inputId}-error`)

    if (!errorMessage) {
      errorMessage = document.createElement('p')
      errorMessage.id = `${inputId}-error`
      errorMessage.className = 'govuk-error-message'
      errorMessage.innerHTML = `<span class="govuk-visually-hidden">Error:</span> ${message}`
      formGroup.insertBefore(errorMessage, fileInput)
    }

    fileInput.setAttribute(
      ARIA_DESCRIBEDBY,
      `error-summary-title ${inputId}-error`
    )
  }
}

/**
 * Helper to safely convert an Element to HTMLElement
 * @param {Element | null} element - The element to convert
 */
function asHTMLElement(element) {
  return /** @type {HTMLElement} */ (element)
}

function reloadPage() {
  window.history.replaceState(null, '', window.location.href)
  window.location.href = window.location.pathname
}

/**
 * Build the upload status URL given the current pathname and the upload ID.
 * @param {string} pathname – e.g. window.location.pathname
 * @param {string} uploadId
 * @returns {string} e.g. "/form/upload-status/abc123"
 */
export function buildUploadStatusUrl(pathname, uploadId) {
  const pathSegments = pathname.split('/').filter((segment) => segment)
  const prefix = pathSegments.length > 0 ? `/${pathSegments[0]}` : ''
  return `${prefix}/upload-status/${uploadId}`
}

/**
 * Polls the upload status endpoint until the file is ready or timeout occurs
 * @param {string} uploadId - The upload ID to check
 */
function pollUploadStatus(uploadId) {
  let attempts = 0
  const interval = setInterval(() => {
    attempts++

    if (attempts >= MAX_POLLING_DURATION) {
      clearInterval(interval)
      reloadPage()
      return
    }

    const uploadStatusUrl = buildUploadStatusUrl(
      window.location.pathname,
      uploadId
    )

    fetch(uploadStatusUrl, {
      headers: {
        Accept: 'application/json'
      }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        return response.json()
      })
      .then((data) => {
        if (data.uploadStatus === 'ready') {
          clearInterval(interval)
          reloadPage()
        }
      })
      .catch(() => {
        clearInterval(interval)
        reloadPage()
      })
  }, 1000)
}

/**
 * Handle standard form submission for file upload
 * @param {HTMLFormElement} formElement - The form element
 * @param {HTMLInputElement} fileInput - The file input element
 * @param {HTMLButtonElement} uploadButton - The upload button
 * @param {HTMLButtonElement} continueButton - The continue button
 * @param {File | null} selectedFile - The selected file
 */
function handleStandardFormSubmission(
  formElement,
  fileInput,
  uploadButton,
  continueButton,
  selectedFile
) {
  renderSummary(selectedFile, 'Uploading…', formElement)

  fileInput.focus()

  setTimeout(() => {
    fileInput.disabled = true
    uploadButton.disabled = true
    continueButton.disabled = true
  }, 100)
}

/**
 * Handle AJAX form submission with upload ID
 * @param {Event} event - The click event
 * @param {HTMLFormElement} formElement - The form element
 * @param {HTMLInputElement} fileInput - The file input element
 * @param {HTMLButtonElement} uploadButton - The upload button
 * @param {HTMLElement | null} errorSummary - The error summary container
 * @param {string | undefined} uploadId - The upload ID
 * @returns {boolean} Whether the event was handled
 */
function handleAjaxFormSubmission(
  event,
  formElement,
  fileInput,
  uploadButton,
  errorSummary,
  uploadId
) {
  if (!formElement.action || !uploadId) {
    return false
  }

  event.preventDefault()

  const formData = new FormData(formElement)
  const isLocalDev = !!formElement.dataset.proxyUrl
  const uploadUrl = formElement.dataset.proxyUrl ?? formElement.action

  const fetchOptions = /** @type {RequestInit} */ ({
    method: 'POST',
    body: formData,
    redirect: isLocalDev ? 'follow' : 'manual' // follow mode if local development with the proxy
  })

  // no-cors mode if needed local development with the proxy
  if (isLocalDev) {
    fetchOptions.mode = 'no-cors'
  }

  fetch(uploadUrl, fetchOptions)
    .then(() => {
      pollUploadStatus(uploadId)
    })
    .catch(() => {
      fileInput.disabled = false
      uploadButton.disabled = false

      showError(
        'There was a problem uploading the file',
        errorSummary,
        fileInput
      )

      return null
    })

  return true
}

export function initFileUpload() {
  const form = document.querySelector('form:has(input[type="file"])')
  /** @type {HTMLInputElement | null} */
  const fileInput = form ? form.querySelector('input[type="file"]') : null
  /** @type {HTMLButtonElement | null} */
  const uploadButton = form ? form.querySelector('.upload-file-button') : null
  const continueButton =
    /** @type {HTMLButtonElement} */ (
      Array.from(document.querySelectorAll('button.govuk-button')).find(
        (button) => button.textContent?.trim() === 'Continue'
      )
    ) ?? null

  const errorSummary = document.querySelector('.govuk-error-summary-container')

  if (!form || !fileInput || !uploadButton) {
    return
  }

  const formElement = /** @type {HTMLFormElement} */ (form)
  /** @type {File | null} */
  let selectedFile = null
  let isSubmitting = false
  const uploadId = formElement.dataset.uploadId

  fileInput.addEventListener('change', () => {
    if (errorSummary) {
      errorSummary.innerHTML = ''
    }

    if (fileInput.files && fileInput.files.length > 0) {
      selectedFile = fileInput.files[0]
    }
  })

  uploadButton.addEventListener('click', (event) => {
    if (!selectedFile) {
      event.preventDefault()
      showError(
        'Select a file',
        /** @type {HTMLElement | null} */ (errorSummary),
        fileInput
      )
      return
    }

    if (isSubmitting) {
      event.preventDefault()
      return
    }

    isSubmitting = true

    handleStandardFormSubmission(
      formElement,
      fileInput,
      uploadButton,
      continueButton,
      selectedFile
    )

    handleAjaxFormSubmission(
      event,
      formElement,
      fileInput,
      uploadButton,
      /** @type {HTMLElement | null} */ (errorSummary),
      uploadId
    )
  })
}
