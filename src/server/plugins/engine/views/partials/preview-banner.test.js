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
    let $paragraphs = /** @type {HTMLElement[]} */ ([])

    describe('Form preview', () => {
      beforeEach(() => {
        const { container } = renderView('partials/preview-banner.html', {
          context: {
            previewMode: status,
            context: {
              isForceAccess: false,
              relevantPages: [{ title: 'Page 1' }]
            }
          }
        })

        $component = container.getByRole('region')
        $paragraphs = container.getAllByRole('paragraph')
      })

      it('should render contents', () => {
        expect($component).toBeInTheDocument()
        expect($component).toContainElement($paragraphs[0])
        expect($component).toHaveClass('govuk-notification-banner')

        expect($paragraphs).toHaveLength(1)
        expect($paragraphs[0]).toHaveClass('govuk-notification-banner__heading')
      })

      it('should have accessible name', () => {
        expect($component).toHaveAccessibleName('Important')
      })

      it('should have text content', () => {
        expect($paragraphs[0]).toHaveTextContent(
          `This is a preview of a ${status} form. Do not enter personal information.`
        )
      })
    })

    describe('Preview URL direct access', () => {
      beforeEach(() => {
        const { container } = renderView('partials/preview-banner.html', {
          context: {
            previewMode: status,
            context: {
              isForceAccess: true,
              relevantPages: [{ title: 'Page 1' }]
            }
          }
        })

        $component = container.getByRole('region')
        $paragraphs = container.getAllByRole('paragraph')
      })

      it('should have text content', () => {
        expect($paragraphs[0]).toHaveTextContent(
          `This is a preview of a ${status} form page.`
        )

        expect($paragraphs[1]).toBeUndefined()
      })
    })

    describe('Preview URL direct access (with previous pages)', () => {
      beforeEach(() => {
        const { container } = renderView('partials/preview-banner.html', {
          context: {
            previewMode: status,
            context: {
              isForceAccess: true,
              relevantPages: [
                { title: 'Page 1' },
                { title: 'Page 2' },
                { title: 'Page 3' }
              ]
            }
          }
        })

        $component = container.getByRole('region')
        $paragraphs = container.getAllByRole('paragraph')
      })

      it('should render contents', () => {
        expect($component).toBeInTheDocument()
        expect($component).toContainElement($paragraphs[0])
        expect($component).toHaveClass('govuk-notification-banner')

        expect($paragraphs).toHaveLength(2)
        expect($paragraphs[0]).toHaveClass('govuk-notification-banner__heading')
        expect($paragraphs[1]).toHaveClass('govuk-body')
      })

      it('should have accessible name', () => {
        expect($component).toHaveAccessibleName('Important')
      })

      it('should have text content', () => {
        expect($paragraphs[0]).toHaveTextContent(
          `This is a preview of a ${status} form page.`
        )

        expect($paragraphs[1]).toHaveTextContent(
          'It depends on answers from earlier pages in the form. In the live version, users will need to complete those questions first.'
        )
      })
    })
  })
})
