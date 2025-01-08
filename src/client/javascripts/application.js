import {
  Button,
  CharacterCount,
  Checkboxes,
  ErrorSummary,
  Header,
  NotificationBanner,
  Radios,
  SkipLink,
  createAll
} from 'govuk-frontend'

createAll(Button)
createAll(CharacterCount)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Header)
createAll(NotificationBanner)
createAll(Radios)
createAll(SkipLink)

// Show preview close link via `rel="opener"`
if (window.opener) {
  const $closeLink = document.querySelector('.js-preview-banner-close')

  $closeLink?.removeAttribute('hidden')
  $closeLink?.addEventListener('click', (event) => {
    event.preventDefault()
    window.close()
  })
}

/**
 * Initialise autocomplete
 * @param {HTMLSelectElement | null} $select
 * @param {(config: object) => void} init
 */
function initAutocomplete($select, init) {
  if (!$select) {
    return
  }

  const config = {
    id: $select.id,
    selectElement: $select
  }

  init(config)

  /** @type {HTMLInputElement | null} */
  const $input = document.querySelector(`#${config.id}`)

  // Allowed values for input
  const inputValues = [...$select.options].map((option) => option.text)

  // Reset select when input value is not allowed
  $input?.addEventListener('blur', () => {
    if (!$input.value || !inputValues.includes($input.value)) {
      $select.value = ''
    }
  })
}

// Find all autocompletes
const $autocompletes = document.querySelectorAll(
  `[data-module="govuk-accessible-autocomplete"]`
)

// Lazy load autocomplete component
if ($autocompletes.length) {
  // @ts-expect-error -- No types available
  import('accessible-autocomplete')
    .then((component) => {
      const { default: accessibleAutocomplete } = component

      // Initialise each autocomplete
      $autocompletes.forEach(($module) =>
        initAutocomplete(
          $module.querySelector('select'),
          accessibleAutocomplete.enhanceSelectElement
        )
      )
    })

    // eslint-disable-next-line no-console
    .catch(console.error)
}
