import { ComponentType, type ComponentDef } from '@defra/forms-model'

import { MultilineTextField } from '~/src/server/plugins/engine/components/MultilineTextField.js'
import { validationOptions } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

describe('Multiline text field', () => {
  test('Should supply custom validation message if defined', () => {
    const def: ComponentDef = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      type: ComponentType.MultilineTextField,
      options: {
        required: false,
        customValidationMessage: 'This is a custom error'
      },
      schema: {
        max: 2
      }
    }
    const multilineTextField = new MultilineTextField(def, {})
    const { formSchema } = multilineTextField
    expect(formSchema.validate('a').error).toBeUndefined()

    expect(formSchema.validate('too many').error?.message).toBe(
      'This is a custom error'
    )
  })

  test('Should validate when schema options are supplied', () => {
    const def: ComponentDef = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      type: ComponentType.MultilineTextField,
      options: {},
      schema: {
        min: 4,
        max: 5
      }
    }
    const multilineTextField = new MultilineTextField(def, {})
    const { formSchema } = multilineTextField

    expect(formSchema.validate('yolk', validationOptions).error).toBeUndefined()

    expect(formSchema.validate('egg', validationOptions).error?.message).toBe(
      'my component must be 4 characters or more'
    )
    expect(
      formSchema.validate('scrambled', validationOptions).error?.message
    ).toBe('my component must be 5 characters or less')

    expect(
      formSchema.validate('scrambled', validationOptions).error?.message
    ).toBe('my component must be 5 characters or less')
  })

  test('Should apply default schema if no options are passed', () => {
    const def: ComponentDef = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      type: ComponentType.MultilineTextField,
      options: {},
      schema: {}
    }
    const multilineTextField = new MultilineTextField(def, {})
    const { formSchema } = multilineTextField

    expect(formSchema.validate('', validationOptions).error?.message).toBe(
      'Enter my component'
    )
    expect(formSchema.validate('benedict').error).toBeUndefined()
  })

  test('should return correct view model when maxwords or schema.length configured', () => {
    const multilineTextFieldMaxWordsDef: ComponentDef = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      type: ComponentType.MultilineTextField,
      options: {
        maxWords: 100
      },
      schema: {
        min: 2
      }
    }
    const multilineTextFieldMaxWords = new MultilineTextField(
      multilineTextFieldMaxWordsDef,
      {}
    )
    expect(multilineTextFieldMaxWords.getViewModel({})).toEqual(
      expect.objectContaining({
        isCharacterOrWordCount: true,
        maxwords: 100
      })
    )

    const multilineTextFieldMaxCharsDef: ComponentDef = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      type: ComponentType.MultilineTextField,
      options: {},
      schema: {
        max: 5,
        min: 2
      }
    }
    const multilineTextFieldMaxChars = new MultilineTextField(
      multilineTextFieldMaxCharsDef,
      {}
    )
    expect(multilineTextFieldMaxChars.getViewModel({})).toEqual(
      expect.objectContaining({
        isCharacterOrWordCount: true,
        maxlength: 5
      })
    )
  })

  test('should return correct view model when not configured with maxwords or schema.length', () => {
    const def: ComponentDef = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      type: ComponentType.MultilineTextField,
      options: {},
      schema: {}
    }
    const multilineTextFieldMaxWords = new MultilineTextField(def, {})
    expect(multilineTextFieldMaxWords.getViewModel({})).toEqual(
      expect.objectContaining({
        isCharacterOrWordCount: false
      })
    )
  })
})
