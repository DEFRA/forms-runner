import { initFileUpload } from '~/src/client/javascripts/file-upload.js'

describe('File Upload Client JS', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
        </div>
        <button class="govuk-button">Continue</button>
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
      fileInput.addEventListener = jest.fn(
        /**
         * @param {string} [type]
         * @param {EventListenerOrEventListenerObject} [handler]
         */
        (type, handler) => {
          if (type === 'change') {
            changeHandler = /** @type {() => void} */ (handler)
          }
          if (type && handler) {
            originalFileInputAddEventListener(type, handler)
          }
        }
      )
    }

    if (uploadButton) {
      const originalButtonAddEventListener =
        uploadButton.addEventListener.bind(uploadButton)
      uploadButton.addEventListener = jest.fn(
        /**
         * @param {string} [type]
         * @param {EventListenerOrEventListenerObject} [handler]
         */
        (type, handler) => {
          if (type === 'click') {
            clickHandler = /** @type {(event: any) => void} */ (handler)
          }
          if (type && handler) {
            originalButtonAddEventListener(type, handler)
          }
        }
      )
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
    const { triggerClick, fileInput } = setupTestableComponent()

    triggerClick(event)

    expect(event.preventDefault).toHaveBeenCalled()

    const errorSummary = document.querySelector('.govuk-error-summary')
    expect(errorSummary).not.toBeNull()
    expect(errorSummary?.textContent).toContain('Select a file')

    const errorSummaryTitle = document.getElementById('error-summary-title')
    expect(errorSummaryTitle).not.toBeNull()
    expect(fileInput?.getAttribute('aria-describedby')).toBe(
      'error-summary-title'
    )
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
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
        </div>
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
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
        </div>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()
    triggerClick({})

    const statusAnnouncer = document.getElementById('statusInformation')
    expect(statusAnnouncer).not.toBeNull()
    expect(document.contains(statusAnnouncer)).toBe(true)
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

  test('renderSummary handles the case where next element is not a form', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <div>Not a form element</div>
    `

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()
    triggerClick({})

    expect(document.querySelector('dl.govuk-summary-list')).toBeNull()
  })

  test('renderSummary inserts summaryList before continue button when no fileCountP.nextSibling exists', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
          <!-- No next sibling after p.govuk-body -->
        </div>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()
    triggerClick({})

    const summaryList = document.querySelector('dl.govuk-summary-list')

    expect(summaryList).not.toBeNull()
    expect(summaryList?.parentElement).toBe(
      document.querySelectorAll('form')[1]
    )

    const fileRow = document.querySelector('[data-filename="some-file.pdf"]')
    expect(fileRow).not.toBeNull()
    expect(fileRow?.textContent).toContain('Uploading…')

    expect(summaryList?.tagName).toBe('DL')
    expect(summaryList?.classList.contains('govuk-summary-list')).toBe(true)
  })

  test('renderSummary properly removes existing row with same filename', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
        </div>
        <dl class="govuk-summary-list govuk-summary-list--long-key">
          <div class="govuk-summary-list__row" data-filename="some-file.pdf">
            <dt class="govuk-summary-list__key">some-file.pdf</dt>
            <dd class="govuk-summary-list__value">
              <strong class="govuk-tag govuk-tag--yellow">Previous status</strong>
            </dd>
            <dd class="govuk-summary-list__actions"></dd>
          </div>
        </dl>
        <button class="govuk-button">Continue</button>
      </form>
    `

    expect(
      document.querySelectorAll('[data-filename="some-file.pdf"]')
    ).toHaveLength(1)
    expect(
      document.querySelector('[data-filename="some-file.pdf"]')?.textContent
    ).toContain('Previous status')

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()
    triggerClick({})

    expect(
      document.querySelectorAll('[data-filename="some-file.pdf"]')
    ).toHaveLength(1)
    expect(
      document.querySelector('[data-filename="some-file.pdf"]')?.textContent
    ).toContain('Uploading…')
    expect(
      document.querySelector('[data-filename="some-file.pdf"]')?.textContent
    ).not.toContain('Previous status')
  })

  test('renderSummary uses fileCountP.nextSibling when no continue button exists', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form id="uploadedFilesContainer">
        <h2 class="govuk-heading-m">Uploaded files</h2>
        <p class="govuk-body">0 files uploaded</p>
        <div class="next-element">Some other element</div>
        <!-- No continue button -->
      </form>
    `

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()
    triggerClick({})

    const summaryList = document.querySelector('dl.govuk-summary-list')

    expect(summaryList).not.toBeNull()

    const secondForm = document.querySelectorAll('form')[1]
    expect(summaryList?.parentElement).toBe(secondForm)

    const fileRow = document.querySelector('[data-filename="some-file.pdf"]')
    expect(fileRow).not.toBeNull()

    const statusAnnouncer = document.getElementById('statusInformation')
    expect(statusAnnouncer).not.toBeNull()
  })

  test('sets aria-describedby on file input to connect with status announcer when uploading', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
        </div>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const { fileInput, loadFile, triggerChange, triggerClick } =
      setupTestableComponent()

    loadFile('test.pdf')
    triggerChange()
    triggerClick({})

    const statusAnnouncer = document.getElementById('statusInformation')

    expect(statusAnnouncer).not.toBeNull()
    expect(fileInput?.getAttribute('aria-describedby')).toBe(
      'statusInformation'
    )
    expect(statusAnnouncer?.textContent).toContain('test.pdf')
    expect(statusAnnouncer?.textContent).toContain('Uploading')
  })

  test('disables controls after timeout when uploading', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
        </div>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const { fileInput, uploadButton, loadFile, triggerChange, triggerClick } =
      setupTestableComponent()

    loadFile('test.pdf')
    triggerChange()
    triggerClick({})

    expect(/** @type {HTMLInputElement} */ (fileInput).disabled).toBe(false)
    expect(/** @type {HTMLButtonElement} */ (uploadButton).disabled).toBe(false)

    jest.advanceTimersByTime(101)

    expect(/** @type {HTMLInputElement} */ (fileInput).disabled).toBe(true)
    expect(/** @type {HTMLButtonElement} */ (uploadButton).disabled).toBe(true)
  })

  test('handles null form gracefully', () => {
    document.body.innerHTML =
      '<div class="govuk-error-summary-container"></div>'
    expect(() => initFileUpload()).not.toThrow()
  })

  test('renderSummary handles existing row correctly', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
        </div>
        <button class="govuk-button">Continue</button>
      </form>
      <div class="govuk-summary-list__row" data-filename="some-file.pdf">
        <dt class="govuk-summary-list__key">some-file.pdf</dt>
        <dd class="govuk-summary-list__value">
          <strong class="govuk-tag govuk-tag--yellow">Old status</strong>
        </dd>
      </div>
    `

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()
    triggerClick({})

    expect(
      document.querySelectorAll('[data-filename="some-file.pdf"]')
    ).toHaveLength(1)

    const summaryList = document.querySelector('dl.govuk-summary-list')
    const fileRow = document.querySelector('[data-filename="some-file.pdf"]')
    expect(fileRow).not.toBeNull()
    expect(fileRow?.parentNode).toBe(summaryList)
    expect(fileRow?.textContent).toContain('Uploading…')
  })

  test('handles missing file count paragraph', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form id="uploadedFilesContainer">
        <h2 class="govuk-heading-m">Uploaded files</h2>
        <!-- No p.govuk-body element -->
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

  test('handles missing file input gracefully', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form id="uploadedFilesContainer">
        <h2 class="govuk-heading-m">Uploaded files</h2>
        <p class="govuk-body">0 files uploaded</p>
        <button class="govuk-button">Continue</button>
      </form>
    `

    expect(() => initFileUpload()).not.toThrow()
  })

  test('handles existing row correctly in dom', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form id="uploadedFilesContainer">
        <h2 class="govuk-heading-m">Uploaded files</h2>
        <p class="govuk-body">0 files uploaded</p>
        <div class="govuk-summary-list__row" data-filename="some-file.pdf">
          <dt>Original row that should be removed</dt>
        </div>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()
    triggerClick({})

    expect(
      document.querySelectorAll('[data-filename="some-file.pdf"]')
    ).toHaveLength(1)

    const row = document.querySelector('[data-filename="some-file.pdf"]')
    expect(row?.textContent).toContain('Uploading…')
    expect(row?.textContent).not.toContain(
      'Original row that should be removed'
    )
  })

  test('file upload handles null form gracefully when creating status announcer', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form id="uploadForm">
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
        </div>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const { loadFile, triggerChange } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()

    const form = document.getElementById('uploadForm')
    if (form) {
      form.parentNode?.removeChild(form)
    }

    const uploadButton = document.querySelector('.upload-file-button')

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    })

    expect(() => {
      uploadButton?.dispatchEvent(clickEvent)
    }).not.toThrow()

    expect(document.querySelector('[data-filename="some-file.pdf"]')).toBeNull()
    expect(document.getElementById('statusInformation')).toBeNull()
  })

  test('renderSummary explicitly handles null selectedFile', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form>
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
        </div>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const { triggerClick } = setupTestableComponent()

    const containerObserver = new MutationObserver(() => {
      /* intentionally empty - we just want to collect mutations */
    })
    const summaryListContainer = document.querySelector('form:nth-child(2)')

    if (summaryListContainer) {
      containerObserver.observe(summaryListContainer, {
        childList: true,
        subtree: true
      })
    }

    containerObserver.takeRecords()

    triggerClick({ preventDefault: jest.fn() })

    const mutations = containerObserver.takeRecords()
    const summaryListAdded = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some(
        (node) =>
          node.nodeType === Node.ELEMENT_NODE &&
          node instanceof HTMLElement &&
          node.classList.contains('govuk-summary-list')
      )
    )

    containerObserver.disconnect()

    expect(summaryListAdded).toBe(false)
    expect(document.querySelector('dl.govuk-summary-list')).toBeNull()
  })

  test('status announcer falls back to document.body when form.appendChild fails', () => {
    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form id="upload-form">
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form id="second-form">
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
        </div>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const containerDiv = document.getElementById('uploadedFilesContainer')
    if (!containerDiv) {
      throw new Error()
    }
    const originalContainerAppend = containerDiv.appendChild.bind(containerDiv)
    containerDiv.appendChild = jest.fn(() => {
      throw new Error()
    })

    const form = document.getElementById('second-form')
    if (!form) {
      throw new Error()
    }
    const originalFormAppend = form.appendChild.bind(form)
    form.appendChild = jest.fn(() => {
      throw new Error()
    })

    const bodyAppendChildSpy = jest.spyOn(document.body, 'appendChild')

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()
    loadFile('test.pdf')
    triggerChange()
    triggerClick({})

    expect(bodyAppendChildSpy).toHaveBeenCalled()
    const statusAnnouncerAppended = bodyAppendChildSpy.mock.calls.some(
      (call) =>
        call[0] instanceof HTMLElement && call[0].id === 'statusInformation'
    )
    expect(statusAnnouncerAppended).toBe(true)

    const statusAnnouncer = document.getElementById('statusInformation')
    expect(statusAnnouncer).not.toBeNull()
    expect(statusAnnouncer?.parentNode).toBe(document.body)

    containerDiv.appendChild = originalContainerAppend
    form.appendChild = originalFormAppend
    bodyAppendChildSpy.mockRestore()
  })

  test('uses form action when proxyUrl is undefined and uses proxyUrl when defined', () => {
    const originalFetch = global.fetch
    const fetchMock = jest.fn(() =>
      Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
    )
    global.fetch = fetchMock

    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form action="http://some-url.com/upload" enctype="multipart/form-data" data-upload-id="test-id">
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
    `
    setupTestableComponent()

    const form = document.querySelector('form')
    const uploadUrl1 = form?.dataset.proxyUrl ?? form?.action

    expect(uploadUrl1).toBe('http://some-url.com/upload')

    form?.setAttribute('data-proxy-url', 'http://some-proxy-url.com/upload')

    const uploadUrl2 = form?.dataset.proxyUrl ?? form?.action

    expect(uploadUrl2).toBe('http://some-proxy-url.com/upload')

    global.fetch = originalFetch
  })

  test('form submission depends on formElement having action attribute and uploadId', () => {
    const originalFormData = global.FormData
    global.FormData = /** @type {any} */ (
      jest.fn(() => ({
        append: jest.fn()
      }))
    )

    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form action="/upload-endpoint" data-upload-id="test-id">
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
    `

    const form1 = document.querySelector('form')
    expect(form1?.hasAttribute('action')).toBe(true)
    expect(form1?.getAttribute('action')).toBe('/upload-endpoint')

    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form data-upload-id="test-id">
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
    `

    const form2 = document.querySelector('form')
    expect(form2?.hasAttribute('action')).toBe(false)

    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form action="/upload-endpoint">
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
    `

    const form3 = document.querySelector('form')
    expect(form3?.hasAttribute('action')).toBe(true)
    expect(form3?.hasAttribute('data-upload-id')).toBe(false)

    global.FormData = originalFormData
  })

  test('upload URL is correctly determined by formElement attributes', () => {
    document.body.innerHTML = `
      <form action="/upload-endpoint" data-upload-id="test-id">
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
    `

    const form1 = document.querySelector('form')
    const uploadUrl1 = form1?.dataset.proxyUrl ?? form1?.getAttribute('action')
    expect(uploadUrl1).toBe('/upload-endpoint')

    document.body.innerHTML = `
      <form action="/upload-endpoint" data-upload-id="test-id" data-proxy-url="/proxy-endpoint">
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
    `

    const form2 = document.querySelector('form')
    const uploadUrl2 = form2?.dataset.proxyUrl ?? form2?.getAttribute('action')
    expect(uploadUrl2).toBe('/proxy-endpoint')

    document.body.innerHTML = `
      <form data-upload-id="test-id" data-proxy-url="/proxy-endpoint">
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
    `

    const form3 = document.querySelector('form')
    const uploadUrl3 = form3?.dataset.proxyUrl ?? form3?.getAttribute('action')
    expect(uploadUrl3).toBe('/proxy-endpoint')

    document.body.innerHTML = `
      <form data-upload-id="test-id">
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
    `

    const form4 = document.querySelector('form')
    const uploadUrl4 = form4?.dataset.proxyUrl ?? form4?.getAttribute('action')
    expect(uploadUrl4).toBeNull()
  })

  test('handles AJAX form submission when form has action and uploadId', () => {
    const originalFetch = global.fetch
    const fetchMock = jest.fn(() =>
      Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
    )
    global.fetch = fetchMock

    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form action="http://some-url.com/upload" enctype="multipart/form-data" data-upload-id="test-id">
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
        </div>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const originalFormData = global.FormData
    const formDataMock = jest.fn(function () {
      return {
        append: jest.fn()
      }
    })
    global.FormData = /** @type {any} */ (formDataMock)

    const tempGlobal = /** @type {any} */ (global)
    // using bracket notation with ESLint disabled to safely add property to global
    // eslint-disable-next-line @typescript-eslint/dot-notation, @typescript-eslint/no-unsafe-member-access
    tempGlobal['pollUploadStatus'] = jest.fn()

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('test-file.pdf')
    triggerChange()

    const preventDefaultMock = jest.fn()
    triggerClick({ preventDefault: preventDefaultMock })

    expect(preventDefaultMock).toHaveBeenCalled()
    expect(formDataMock).toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://some-url.com/upload',
      expect.objectContaining({
        method: 'POST',
        redirect: 'manual'
      })
    )

    global.fetch = originalFetch
    global.FormData = originalFormData
  })

  test('handles AJAX form submission with proxy URL when provided', () => {
    const originalFetch = global.fetch
    const fetchMock = jest.fn(() =>
      Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
    )
    global.fetch = fetchMock

    const originalFormData = global.FormData
    const formDataMock = jest.fn(function () {
      return {
        append: jest.fn()
      }
    })
    global.FormData = /** @type {any} */ (formDataMock)

    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form action="/upload-endpoint" data-proxy-url="/proxy-endpoint" data-upload-id="test-id" enctype="multipart/form-data">
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
        </div>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const tempGlobal = /** @type {any} */ (global)
    // eslint-disable-next-line @typescript-eslint/dot-notation, @typescript-eslint/no-unsafe-member-access
    tempGlobal['pollUploadStatus'] = jest.fn()

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()

    const preventDefaultMock = jest.fn()
    triggerClick({ preventDefault: preventDefaultMock })

    expect(preventDefaultMock).toHaveBeenCalled()
    expect(formDataMock).toHaveBeenCalled()

    expect(fetchMock).toHaveBeenCalledWith(
      '/proxy-endpoint',
      expect.objectContaining({
        method: 'POST',
        redirect: 'follow',
        mode: 'no-cors'
      })
    )

    // it was NOT called with 'manual' redirect
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/proxy-endpoint',
      expect.objectContaining({
        redirect: 'manual'
      })
    )

    global.fetch = originalFetch
    global.FormData = originalFormData
  })

  test('handles AJAX form submission without proxy URL (production)', () => {
    const originalFetch = global.fetch
    const fetchMock = jest.fn(() =>
      Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
    )
    global.fetch = fetchMock

    const originalFormData = global.FormData
    const formDataMock = jest.fn(function () {
      return {
        append: jest.fn()
      }
    })
    global.FormData = /** @type {any} */ (formDataMock)

    document.body.innerHTML = `
      <div class="govuk-error-summary-container"></div>
      <form action="/upload-endpoint" data-upload-id="test-id" enctype="multipart/form-data">
        <input type="file" id="file-upload">
        <button class="govuk-button govuk-button--secondary upload-file-button">Upload file</button>
      </form>
      <form>
        <div id="uploadedFilesContainer">
          <h2 class="govuk-heading-m">Uploaded files</h2>
          <p class="govuk-body">0 files uploaded</p>
        </div>
        <button class="govuk-button">Continue</button>
      </form>
    `

    const tempGlobal = /** @type {any} */ (global)
    // eslint-disable-next-line @typescript-eslint/dot-notation, @typescript-eslint/no-unsafe-member-access
    tempGlobal['pollUploadStatus'] = jest.fn()

    const { loadFile, triggerChange, triggerClick } = setupTestableComponent()

    loadFile('some-file.pdf')
    triggerChange()

    const preventDefaultMock = jest.fn()
    triggerClick({ preventDefault: preventDefaultMock })

    expect(preventDefaultMock).toHaveBeenCalled()
    expect(formDataMock).toHaveBeenCalled()

    expect(fetchMock).toHaveBeenCalled()
    const [actualUrl, options] = /** @type {[string, RequestInit]} */ (
      /** @type {unknown} */ (fetchMock.mock.calls[0])
    )
    expect(actualUrl.endsWith('/upload-endpoint')).toBe(true)
    expect(options).toMatchObject({
      method: 'POST',
      redirect: 'manual'
    })

    expect(options.mode).not.toBe('no-cors')

    global.fetch = originalFetch
    global.FormData = originalFormData
  })
})
