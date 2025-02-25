import { initFileUpload } from '~/src/client/javascripts/file-upload.js'

describe('File Upload Client JS', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
    `

    jest.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  test('initFileUpload initializes without errors when DOM elements are present', () => {
    expect(() => initFileUpload()).not.toThrow()
  })

  test('initFileUpload does nothing when required DOM elements are missing', () => {
    document.body.innerHTML = '<div></div>'
    expect(() => initFileUpload()).not.toThrow()
  })

  function setupTestableComponent(runInit = true) {
    const fileInput = document.querySelector('input[type="file"]')
    const uploadButton = document.querySelector('.upload-file-button')

    /** @type {(() => void) | null} */
    let changeHandler = null
    /** @type {((event: any) => void) | null} */
    let clickHandler = null

    if (fileInput) {
      const originalFileInputAddEventListener =
        fileInput.addEventListener.bind(fileInput)
      fileInput.addEventListener = jest.fn((type, handler) => {
        if (type === 'change') {
          changeHandler = /** @type {() => void} */ (handler)
        }
        originalFileInputAddEventListener(type, handler)
      })
    }

    if (uploadButton) {
      const originalButtonAddEventListener =
        uploadButton.addEventListener.bind(uploadButton)
      uploadButton.addEventListener = jest.fn((type, handler) => {
        if (type === 'click') {
          clickHandler = /** @type {(event: any) => void} */ (handler)
        }
        originalButtonAddEventListener(type, handler)
      })
    }

    if (runInit) {
      initFileUpload()
    }

    return {
      fileInput,
      uploadButton,
      triggerChange: () => {
        if (changeHandler) changeHandler()
      },
      triggerClick: (event = {}) => {
        if (clickHandler) clickHandler(event)
      },
      loadFile: (filename = 'some-file.pdf') => {
        if (!fileInput) return
        const file = new File(['some file'], filename, {
          type: 'application/pdf'
        })
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: true
        })
      },
      runInit: () => {
        initFileUpload()
      }
    }
  }

  test('shows error when upload button is clicked without selecting a file', () => {
    const event = { preventDefault: jest.fn() }
    const { triggerClick } = setupTestableComponent()

    triggerClick(event)

    expect(event.preventDefault).toHaveBeenCalled()

    const errorSummary = document.querySelector('.govuk-error-summary')
    expect(errorSummary).not.toBeNull()
    expect(errorSummary?.textContent).toContain('Select a file')
  })

  test('clears error when file is selected', () => {
    const errorContainer = document.querySelector(
      '.govuk-error-summary-container'
    )
    if (!errorContainer) return

    errorContainer.innerHTML = `
      <div class="govuk-error-summary" data-module="govuk-error-summary">
        <div role="alert">
          <h2 class="govuk-error-summary__title">There is a problem</h2>
          <div class="govuk-error-summary__body">
            <ul class="govuk-list govuk-error-summary__list">
              <li><a href="#file-upload">Select a file</a></li>
            </ul>
          </div>
        </div>
      </div>
    `

    expect(document.querySelector('.govuk-error-summary')).not.toBeNull()

    const { loadFile, triggerChange } = setupTestableComponent()

    loadFile()
    triggerChange()

    expect(errorContainer.innerHTML).toBe('')
  })

  test('renderSummary creates new summary list when it does not exist', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <h2 class="govuk-heading-m">Uploaded files</h2>
        <p class="govuk-body">0 files uploaded</p>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()
    triggerClick({})

    const summaryList = document.querySelector('dl.govuk-summary-list')
    expect(summaryList).not.toBeNull()
    expect(summaryList?.className).toContain('govuk-summary-list--long-key')
    expect(summaryList?.parentElement?.tagName).toBe('FORM')
  })

  test('renderSummary uses existing summary list when it already exists', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <h2 class="govuk-heading-m">Uploaded files</h2>
        <p class="govuk-body">0 files uploaded</p>
        <dl class="govuk-summary-list govuk-summary-list--long-key"></dl>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()
    const originalSummaryList = document.querySelector('dl.govuk-summary-list')

    loadFile('some-file.pdf')
    triggerChange()
    triggerClick({})

    const currentSummaryList = document.querySelector('dl.govuk-summary-list')
    expect(currentSummaryList).toBe(originalSummaryList)
    expect(document.querySelectorAll('dl.govuk-summary-list')).toHaveLength(1)
  })

  test('renderSummary handles existing rows with same filename', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <h2 class="govuk-heading-m">Uploaded files</h2>
        <p class="govuk-body">0 files uploaded</p>
        <dl class="govuk-summary-list govuk-summary-list--long-key">
          <div class="govuk-summary-list__row" data-filename="test.pdf">
            <dt class="govuk-summary-list__key">test.pdf</dt>
            <dd class="govuk-summary-list__value">
              <strong class="govuk-tag govuk-tag--yellow">Uploading…</strong>
            </dd>
            <dd class="govuk-summary-list__actions"></dd>
          </div>
        </dl>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()
    triggerClick({})

    expect(
      document.querySelectorAll('[data-filename="test.pdf"]')
    ).toHaveLength(1)
    expect(
      document.querySelector('[data-filename="test.pdf"]')?.textContent
    ).toContain('Uploading…')
  })

  test('renderSummary does nothing when selectedFile is null', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <h2 class="govuk-heading-m">Uploaded files</h2>
        <p class="govuk-body">0 files uploaded</p>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const { triggerClick } = setupTestableComponent()

    triggerClick({ preventDefault: jest.fn() })

    const summaryList = document.querySelector('dl.govuk-summary-list')
    expect(summaryList).toBeNull()
  })

  test('renderSummary does nothing when second form is missing', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
    `

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()
    triggerClick({})

    const summaryList = document.querySelector('dl.govuk-summary-list')
    expect(summaryList).toBeNull()
  })

  test('renderSummary does nothing when file count paragraph is missing', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <h2 class="govuk-heading-m">Uploaded files</h2>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()
    triggerClick({})

    const summaryList = document.querySelector('dl.govuk-summary-list')
    expect(summaryList).toBeNull()
  })

  test('status announcer is created or attached properly', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <h2 class="govuk-heading-m">Uploaded files</h2>
        <p class="govuk-body">0 files uploaded</p>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()
    triggerClick({})

    const statusAnnouncer = document.querySelector('#statusInformation')
    const secondForm = document.querySelectorAll('form')[1]

    expect(statusAnnouncer).not.toBeNull()
    expect(statusAnnouncer?.parentNode).toBe(secondForm)
  })

  test('disables form controls after submission', () => {
    const { fileInput, loadFile, triggerChange, triggerClick } =
      setupTestableComponent()

    /** @type {HTMLInputElement | null} */
    const input = /** @type {HTMLInputElement} */ (fileInput)
    expect(input.disabled).toBeFalsy()
    /** @type {HTMLButtonElement | null} */
    const button = document.querySelector('.upload-file-button')
    expect(button?.disabled).toBeFalsy()

    loadFile()
    triggerChange()
    triggerClick({})

    jest.advanceTimersByTime(150)

    expect(input.disabled).toBeTruthy()
    expect(button?.disabled).toBeTruthy()
  })

  test('sets focus on file input after upload begins', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
    `

    const fileInput = /** @type {HTMLInputElement} */ (
      document.querySelector('input[type="file"]')
    )

    const focusSpy = jest.spyOn(fileInput, 'focus')

    const { loadFile, triggerChange, triggerClick } =
      setupTestableComponent(true)

    loadFile('test.pdf')
    triggerChange()
    triggerClick({})

    expect(focusSpy).toHaveBeenCalled()
  })

  test('prevents multiple submissions', () => {
    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()

    if (document.querySelector('.govuk-error-summary-container')) {
      const container = /** @type {HTMLElement} */ (
        document.querySelector('.govuk-error-summary-container')
      )
      container.innerHTML = ''
    }

    const event1 = { preventDefault: jest.fn() }
    triggerClick(event1)
    expect(event1.preventDefault).not.toHaveBeenCalled()

    const event2 = { preventDefault: jest.fn() }
    triggerClick(event2)
    expect(event2.preventDefault).toHaveBeenCalled()
  })
})
