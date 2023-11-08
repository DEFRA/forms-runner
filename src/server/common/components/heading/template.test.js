import { renderComponent } from '~/test-helpers/component-helpers'

describe('Heading Component', () => {
  let $heading

  describe('With caption', () => {
    beforeEach(() => {
      $heading = renderComponent('heading', {
        text: 'Services',
        caption: 'A page showing available services'
      })
    })

    test('Should render app heading component', () => {
      expect($heading('[data-testid="app-heading"]').length).toEqual(1)
    })

    test('Should contain expected heading', () => {
      expect(
        $heading('[data-testid="app-heading-title"]').text().trim()
      ).toEqual('Services')
    })

    test('Should have expected heading caption', () => {
      expect(
        $heading('[data-testid="app-heading-caption"]').text().trim()
      ).toEqual('A page showing available services')
    })
  })
})
