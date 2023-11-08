import { renderComponent } from '~/test-helpers/component-helpers'

describe('Page Body Component', () => {
  let $pageBody

  describe('With child content', () => {
    beforeEach(() => {
      $pageBody = renderComponent(
        'page-body',
        {},
        '<p>Used digger, digs great and is lots of fun to dig huge holes with. Comes with heater, comfy seat and radio.</p>'
      )
    })

    test('Should render expected page body', () => {
      expect($pageBody('[data-testid="app-page-body"]').html().trim()).toEqual(
        '<p>Used digger, digs great and is lots of fun to dig huge holes with. Comes with heater, comfy seat and radio.</p>'
      )
    })
  })

  describe('With text param', () => {
    beforeEach(() => {
      $pageBody = renderComponent('page-body', {
        text: 'Used digger, digs great and is lots of fun to dig huge holes with. Comes with heater, comfy seat and radio.'
      })
    })

    test('Should render expected page body', () => {
      expect($pageBody('[data-testid="app-page-body"]').html().trim()).toEqual(
        'Used digger, digs great and is lots of fun to dig huge holes with. Comes with heater, comfy seat and radio.'
      )
    })
  })

  describe('With html param', () => {
    beforeEach(() => {
      $pageBody = renderComponent('page-body', {
        html: '<p>Used digger, digs great and is lots of fun to dig huge holes with. Comes with heater, comfy seat and radio.</p>'
      })
    })

    test('Should render expected page body', () => {
      expect($pageBody('[data-testid="app-page-body"]').html().trim()).toEqual(
        '<p>Used digger, digs great and is lots of fun to dig huge holes with. Comes with heater, comfy seat and radio.</p>'
      )
    })
  })
})
