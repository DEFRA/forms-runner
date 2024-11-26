import { renderMacro } from '~/test/helpers/component-helpers.js'

describe('Tag environment component', () => {
  describe.each([
    {
      text: 'Local',
      env: 'local',
      colour: 'green'
    },
    {
      text: 'Development',
      env: 'dev',
      colour: 'grey'
    },
    {
      text: 'Test',
      env: 'test',
      colour: 'yellow'
    },
    {
      text: 'External test',
      env: 'ext-test',
      colour: 'yellow'
    },
    {
      text: 'Performance test',
      env: 'perf-test',
      colour: 'yellow'
    },
    {
      text: 'Production',
      env: 'prod',
      colour: 'red'
    },
    {
      text: 'Unknown environment',
      env: 'unknown-environment',
      colour: 'grey'
    }
  ])('Environment: $text', ({ text, env, colour }) => {
    let $component = /** @type {HTMLElement | null} */ (null)

    beforeEach(() => {
      const { container } = renderMacro(
        'appTagEnv',
        'components/tag-env/macro.njk',
        { params: { env } }
      )

      $component = container.getByRole('strong')
    })

    it('should render contents', () => {
      expect($component).toBeInTheDocument()
      expect($component).toHaveClass('govuk-tag')
    })

    it('should have text content', () => {
      expect($component).toHaveTextContent(text)
    })

    it('should use environment colour', () => {
      expect($component).toHaveClass(`govuk-tag--${colour}`)
    })
  })
})
