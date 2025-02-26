/* eslint-disable no-console */
/**
 * Creates or updates status announcer for screen readers
 * @param {HTMLElement|null} form - The form element
 * @param {HTMLElement|null} fileCountP - The file count paragraph element
 * @returns {HTMLElement} The status announcer element
 */
function createOrUpdateStatusAnnouncer(form, fileCountP) {
  if (!form) {
    console.warn('Form is null in createOrUpdateStatusAnnouncer')
    const dummyElement = document.createElement('div')
    return dummyElement
  }

  let statusAnnouncer = form.querySelector('#statusInformation')

  if (!statusAnnouncer) {
    statusAnnouncer = document.createElement('div')
    statusAnnouncer.id = 'statusInformation'
    statusAnnouncer.className = 'govuk-visually-hidden'
    statusAnnouncer.setAttribute('aria-live', 'polite')

    try {
      if (fileCountP) {
        if (fileCountP.nextSibling && fileCountP.parentNode === form) {
          form.insertBefore(statusAnnouncer, fileCountP.nextSibling)
        } else {
          const parentElement = fileCountP.parentNode ?? form
          parentElement.appendChild(statusAnnouncer)
        }
      } else {
        form.appendChild(statusAnnouncer)
      }
    } catch (error) {
      console.warn(
        'Error inserting status announcer:',
        error.message,
        error.stack
      )
      try {
        form.appendChild(statusAnnouncer)
      } catch (innerError) {
        console.error(
          'Could not append status announcer to form:',
          innerError.message,
          innerError.stack
        )
        document.body.appendChild(statusAnnouncer)
      }
    }
  }

  return /** @type {HTMLElement} */ (statusAnnouncer)
}

/**
 * Renders or updates the file summary box for the selected file
 * @param {File | null} selectedFile - The selected file
 * @param {string} statusText - The status to display
 * @param {HTMLElement} form - The form element
 */
function renderSummary(selectedFile, statusText, form) {
  if (!selectedFile) {
    return
  }

  const uploadForm = document.querySelector('form:has(#uploadedFilesContainer)')

  console.log('Form:', form)
  console.log('Upload form found by ID:', uploadForm)

  if (!uploadForm || !(uploadForm instanceof HTMLFormElement)) {
    console.warn('Upload form not found or not a form element')
    return
  }

  const fileCountP = uploadForm.querySelector('p.govuk-body')
  if (!fileCountP) {
    console.warn('File count paragraph not found')
    return
  }

  const statusAnnouncer = createOrUpdateStatusAnnouncer(
    /** @type {HTMLElement} */ (uploadForm),
    /** @type {HTMLElement} */ (fileCountP)
  )

  const fileInput = form.querySelector('input[type="file"]')
  if (fileInput) {
    fileInput.setAttribute('aria-describedby', 'statusInformation')
  }

  let summaryList = uploadForm.querySelector('dl.govuk-summary-list')
  if (!summaryList) {
    summaryList = document.createElement('dl')
    summaryList.className = 'govuk-summary-list govuk-summary-list--long-key'

    const continueButton = uploadForm.querySelector('.govuk-button')
    if (continueButton) {
      uploadForm.insertBefore(summaryList, continueButton)
    } else {
      uploadForm.insertBefore(summaryList, fileCountP.nextSibling)
    }
  }

  const existingRow = document.querySelector(
    `[data-filename="${selectedFile.name}"]`
  )
  if (existingRow) {
    existingRow.remove()
  }

  const row = document.createElement('div')
  row.className = 'govuk-summary-list__row'
  row.setAttribute('data-filename', selectedFile.name)
  row.innerHTML = `
      <dt class="govuk-summary-list__key">
        ${selectedFile.name}
      </dt>
      <dd class="govuk-summary-list__value">
        <strong class="govuk-tag govuk-tag--yellow">${statusText}</strong>
      </dd>
      <dd class="govuk-summary-list__actions">
      </dd>
    `

  summaryList.insertBefore(row, summaryList.firstChild)
  statusAnnouncer.textContent = `${selectedFile.name} ${statusText}`
}

/**
 * Shows an error message using the GOV.UK error summary component
 * @param {string} message - The error message to display
 * @param {HTMLElement | null} errorSummary - The error summary container
 * @param {HTMLInputElement} fileInput - The file input element
 * @returns {void}
 */
function showError(message, errorSummary, fileInput) {
  if (errorSummary) {
    errorSummary.innerHTML = `
        <div class="govuk-error-summary" data-module="govuk-error-summary">
          <div role="alert">
            <h2 class="govuk-error-summary__title">
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
    fileInput.setAttribute('aria-describedby', 'error-summary-title')
  }
}

export function initFileUpload() {
  const form = document.querySelector('form')
  console.log('🚀 ~ initFileUpload ~ form:', form)
  /** @type {HTMLInputElement | null} */
  const fileInput = document.querySelector('input[type="file"]')
  /** @type {HTMLButtonElement | null} */
  const uploadButton = document.querySelector('.upload-file-button')
  const errorSummary = document.querySelector('.govuk-error-summary-container')

  if (!form || !fileInput || !uploadButton) {
    return
  }

  /** @type {File | null} */
  let selectedFile = null
  let isSubmitting = false

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
    renderSummary(selectedFile, 'Uploading…', form)

    // moves focus back to the file input for screen readers
    fileInput.focus()

    // submission still happens via formAction in the form
    // and we're not disabling controls until after form submits to avoid blocking submission
    setTimeout(() => {
      fileInput.disabled = true
      uploadButton.disabled = true
    }, 100)
  })
}
