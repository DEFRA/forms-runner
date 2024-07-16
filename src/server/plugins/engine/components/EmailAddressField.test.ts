import { ComponentType, type ComponentDef } from '@defra/forms-model'

import { EmailAddressField } from '~/src/server/plugins/engine/components/index.js'

describe('Email address field', () => {
  test("Should add 'email' to the autocomplete attribute", () => {
    const def: ComponentDef = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      type: ComponentType.EmailAddressField,
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
