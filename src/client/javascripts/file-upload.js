export function initFileUpload() {
  const form = document.querySelector('form')
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

  /**
   * Renders or updates the file summary box for the selected file
   * @param {string} statusText - The status to display
   */
  function renderSummary(statusText) {
    if (!selectedFile) return

    let summaryList = document.querySelector('form dl.govuk-summary-list')
    if (!summaryList) {
      summaryList = document.createElement('dl')
      summaryList.className = 'govuk-summary-list govuk-summary-list--long-key'
      const form = document.querySelector('form')
      const continueButton = form?.querySelector('.govuk-button')
      form?.insertBefore(summaryList, continueButton ?? null)
    }

    let statusAnnouncer = document.querySelector('#statusInformation')
    if (!statusAnnouncer) {
      statusAnnouncer = document.createElement('div')
      statusAnnouncer.id = 'statusInformation'
      statusAnnouncer.className = 'govuk-visually-hidden'
      statusAnnouncer.setAttribute('aria-live', 'polite')

      if (summaryList.parentNode) {
        summaryList.parentNode.insertBefore(statusAnnouncer, summaryList)
      } else {
        form?.insertBefore(statusAnnouncer, summaryList)
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
   * @returns {void}
   */
  function showError(message) {
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
      fileInput?.setAttribute('aria-describedby', 'error-summary-title')
    }
  }

  // when a file is selected, clear any error messages
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
      showError('Select a file')
      return
    }

    // prevent multiple submissions if one is already in progress
    if (isSubmitting) {
      event.preventDefault()
      return
    }

    isSubmitting = true

    renderSummary('Uploading…')

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

document.addEventListener('DOMContentLoaded', function () {
  const form = document.querySelector('form')

  if (!form) {
    console.error('No form is present on the page')
    return
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault() // Prevent default form submission

    const uploadId = '' // extract uploadId from form.action

    const formData = new FormData(form)

    fetch(form.action, {
      method: form.method || 'POST',
      body: formData,
      redirect: 'manual'
    })
      .then(() => {
        checkUploadStatus(uploadId) // Start checking upload status
      })
      .catch((error) => {
        console.error('Error:', error)
        alert('File upload failed')
      })
  })

  function checkUploadStatus(uploadId) {
    const interval = setInterval(() => {
      fetch(`/upload-status/${uploadId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.uploadStatus === 'ready') {
            clearInterval(interval)
            location.reload()
          }
        })
        .catch((error) => console.error('Error checking upload status:', error))
    }, 5000)
  }
})
