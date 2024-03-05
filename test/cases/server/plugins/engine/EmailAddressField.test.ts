import { expect } from '@hapi/code'
import * as Lab from '@hapi/lab'
import { EmailAddressField } from '../../../../../src/server/plugins/engine/components'

export const lab = Lab.script()
const { suite, test } = lab

suite('Email address field', () => {
  test("Should add 'email' to the autocomplete attribute", () => {
    const def = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      options: {},
      schema: {}
    }
    const emailAddressField = new EmailAddressField(def, {})
    expect(emailAddressField.getViewModel({})).to.contain({
      autocomplete: 'email'
    })
  })
})
