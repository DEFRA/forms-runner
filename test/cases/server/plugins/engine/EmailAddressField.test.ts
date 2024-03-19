import { EmailAddressField } from '../../../../../src/server/plugins/engine/components'

describe('Email address field', () => {
  test("Should add 'email' to the autocomplete attribute", () => {
    const def = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      options: {},
      schema: {}
    }
    const emailAddressField = new EmailAddressField(def, {})
    expect(emailAddressField.getViewModel({})).toEqual(
      expect.objectContaining({
        autocomplete: 'email'
      })
    )
  })
})
