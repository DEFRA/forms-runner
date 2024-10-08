import { ComponentType, type ComponentDef } from '@defra/forms-model'

import { TelephoneNumberField } from '~/src/server/plugins/engine/components/TelephoneNumberField.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

describe('Telephone number field', () => {
  test('Should supply custom validation message if defined', () => {
    const def: ComponentDef = {
      name: 'myComponent',
      title: 'Telephone number',
      hint: 'a hint',
      type: ComponentType.TelephoneNumberField,
      options: {
        customValidationMessage: 'This is a custom error',
        required: false
      }
    }
    const telephoneNumberField = new TelephoneNumberField(def, {})
    const { formSchema: schema } = telephoneNumberField

    expect(schema.validate('not a phone', opts).error?.message).toBe(
      'This is a custom error'
    )
    expect(schema.validate('', opts).error).toBeUndefined()
    expect(schema.validate('+111-111-11', opts).error?.message).toBeUndefined()
    expect(schema.validate('+111 111 11', opts).error?.message).toBeUndefined()
    expect(schema.validate('+11111111', opts).error?.message).toBeUndefined()
    expect(schema.validate('+44 7930 111 222', opts).error).toBeUndefined()
    expect(schema.validate('07930 111 222', opts).error).toBeUndefined()
    expect(schema.validate('01606 76543', opts).error).toBeUndefined()
    expect(schema.validate('01606 765432', opts).error).toBeUndefined()
    expect(schema.validate('0203 765 443', opts).error).toBeUndefined()
    expect(schema.validate('0800 123 321', opts).error).toBeUndefined()
    expect(schema.validate('(01606) 765432', opts).error).toBeUndefined()
    expect(schema.validate('(01606) 765-432', opts).error).toBeUndefined()
    expect(schema.validate('01606 765-432', opts).error).toBeUndefined()
    expect(schema.validate('+44203-765-443', opts).error).toBeUndefined()
    expect(schema.validate('0800123-321', opts).error).toBeUndefined()
    expect(schema.validate('0800-123-321', opts).error).toBeUndefined()
  })

  test('Should validate when schema options are supplied', () => {
    const def: ComponentDef = {
      name: 'myComponent',
      title: 'Telephone number',
      hint: 'a hint',
      type: ComponentType.TelephoneNumberField,
      options: {}
    }
    const telephoneNumberField = new TelephoneNumberField(def, {})
    const { formSchema: schema } = telephoneNumberField

    expect(schema.validate('1234', opts).error?.message).toBeUndefined()
    expect(schema.validate('12345', opts).error?.message).toBeUndefined()
    expect(schema.validate('1', opts).error?.message).toBeUndefined()
    expect(schema.validate('12-3', opts).error?.message).toBeUndefined()
    expect(schema.validate('1  1', opts).error?.message).toBeUndefined()
  })

  test('Should apply default schema if no options are passed', () => {
    const def: ComponentDef = {
      name: 'myComponent',
      title: 'Telephone number',
      hint: 'a hint',
      type: ComponentType.TelephoneNumberField,
      options: {}
    }
    const telephoneNumberField = new TelephoneNumberField(def, {})
    const { formSchema: schema } = telephoneNumberField

    expect(schema.validate('not a phone', opts).error?.message).toBe(
      'Enter a valid telephone number'
    )
  })
  test("Should add 'tel' to the autocomplete attribute", () => {
    const def: ComponentDef = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      type: ComponentType.TelephoneNumberField,
      options: {}
    }
    const telephoneNumberField = new TelephoneNumberField(def, {})
    expect(telephoneNumberField.getViewModel({})).toEqual(
      expect.objectContaining({
        autocomplete: 'tel'
      })
    )
  })
})
