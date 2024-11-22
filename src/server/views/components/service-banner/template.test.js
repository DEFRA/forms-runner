import { renderMacro } from '~/test/helpers/component-helpers.js'

describe('Service banner component', () => {
  let $component = /** @type {HTMLElement | null} */ (null)
  let $content = /** @type {HTMLElement | null} */ (null)
  let $text = /** @type {HTMLElement | null} */ (null)

  beforeEach(() => {
    const { container, document } = renderMacro(
      'appServiceBanner',
      'components/service-banner/macro.njk',
      {
        params: {
          title: 'Service status',
          text: 'This is a service status message'
        }
      }
    )

    $component = container.getByRole('complementary')
    $content = document.querySelector('.app-service-banner__content')
    $text = document.querySelector('.app-service-banner__text')
  })

  it('should render contents', () => {
    expect($component).toBeInTheDocument()
    expect($component).toHaveClass('app-service-banner')
    expect($component).toContainElement($content)
    expect($content).toContainElement($text)
  })

  it('should announce service message', () => {
    expect($component).toHaveAttribute('aria-live', 'polite')
  })

  it('should have accessible name', () => {
    expect($component).toHaveAccessibleName('Service status')
  })

  it('should have text content', () => {
    expect($text).toHaveTextContent('This is a service status message')
  })
})
