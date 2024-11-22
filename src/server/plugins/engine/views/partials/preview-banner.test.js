import { FormStatus } from '~/src/server/routes/types.js'
import { renderView } from '~/test/helpers/component-helpers.js'

describe('Preview banner partial', () => {
  describe.each([
    {
      status: FormStatus.Draft
    },
    {
      status: FormStatus.Live
    }
  ])('Status: $status', ({ status }) => {
    let $component = /** @type {HTMLElement | null} */ (null)
    let $paragraph = /** @type {HTMLElement | null} */ (null)

    beforeEach(() => {
      const { container } = renderView('partials/preview-banner.html', {
        context: { previewMode: status }
      })

      $component = container.getByRole('region')
      $paragraph = container.getByRole('paragraph')
    })

    it('should render contents', () => {
      expect($component).toBeInTheDocument()
      expect($component).toContainElement($paragraph)
      expect($component).toHaveClass('govuk-notification-banner')
      expect($paragraph).toHaveClass('govuk-notification-banner__heading')
    })

    it('should have accessible name', () => {
      expect($component).toHaveAccessibleName('Important')
    })

    it('should have text content', () => {
      expect($component).toHaveTextContent(
        `This is a preview of a ${status} form. Do not enter personal information.`
      )
    })
  })
})
