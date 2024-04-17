import { TelephoneNumberField } from '../../../../../src/server/plugins/engine/components/index.js'

describe('Telephone number field', () => {
  test('Should supply custom validation message if defined', () => {
    const def = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      options: {
        customValidationMessage: 'This is a custom error',
        required: false
      }
    }
    const telephoneNumberField = new TelephoneNumberField(def, {})
    const { schema } = telephoneNumberField

    expect(schema.validate('not a phone').error.message).toBe(
      'This is a custom error'
    )
    expect(schema.validate('').error).toBeUndefined()
    expect(schema.validate('+111-111-11').error).toBeUndefined()
    expect(schema.validate('+111 111 11').error).toBeUndefined()
    expect(schema.validate('+11111111').error).toBeUndefined()
  })

  test('Should validate when schema options are supplied', () => {
    const def = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      options: {},
      schema: {
        min: 3,
        max: 5,
        regex: '^[0-9+()]*$'
      }
    }
    const telephoneNumberField = new TelephoneNumberField(def, {})
    const { schema } = telephoneNumberField

    expect(schema.validate('1234').error).toBeUndefined()
    expect(schema.validate('12345').error).toBeUndefined()
    expect(schema.validate('1').error.message).toContain(
      'must be at least 3 characters long'
    )
    expect(schema.validate('12-3').error.message).toContain(
      'Enter a telephone number in the correct format'
    )
    expect(schema.validate('1  1').error.message).toContain(
      'Enter a telephone number in the correct format'
    )
  })

  test('Should apply default schema if no options are passed', () => {
    const def = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      options: {},
      schema: {}
    }
    const telephoneNumberField = new TelephoneNumberField(def, {})
    const { schema } = telephoneNumberField

    expect(schema.validate('not a phone').error.message).toBe(
      'Enter a telephone number in the correct format'
    )
  })
  test("Should add 'tel' to the autocomplete attribute", () => {
    const def = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      options: {},
      schema: {}
    }
    const telephoneNumberField = new TelephoneNumberField(def, {})
    expect(telephoneNumberField.getViewModel({})).toEqual(
      expect.objectContaining({
        autocomplete: 'tel'
      })
    )
  })
})
