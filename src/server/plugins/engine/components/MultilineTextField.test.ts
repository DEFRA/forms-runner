import {
  ComponentType,
  type FormDefinition,
  type MultilineTextFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { MultilineTextField } from '~/src/server/plugins/engine/components/MultilineTextField.js'
import { type FormComponentFieldClass } from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('MultilineTextField', () => {
  const definition = {
    pages: [],
    lists: [],
    sections: [],
    conditions: []
  } satisfies FormDefinition

  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: MultilineTextFieldComponent
    let collection: ComponentCollection
    let component: FormComponentFieldClass

    beforeEach(() => {
      def = {
        title: 'Example textarea',
        name: 'myComponent',
        type: ComponentType.MultilineTextField,
        options: {},
        schema: {}
      } satisfies MultilineTextFieldComponent

      collection = new ComponentCollection([def], { model })
      component = collection.questions[0]
    })

    describe('Schema', () => {
      it('uses component title as label', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              label: 'example textarea'
            })
          })
        )
      })

      it('uses component name as keys', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(component.keys).toEqual(['myComponent'])
        expect(component.collection).toBeUndefined()

        for (const key of component.keys) {
          expect(keys).toHaveProperty(key)
        }
      })

      it('is required by default', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              presence: 'required'
            })
          })
        )
      })

      it('is optional when configured', () => {
        const collectionOptional = new ComponentCollection(
          [{ ...def, options: { required: false } }],
          { model }
        )

        const { formSchema } = collectionOptional
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({ allow: [''] })
        )

        const result = collectionOptional.validate(getFormData(''))
        expect(result.errors).toBeUndefined()
      })

      it('accepts valid values', () => {
        const result1 = collection.validate(getFormData('Text'))
        const result2 = collection.validate(getFormData('Textarea'))

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(getFormData(''))

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Enter example textarea'
          })
        ])
      })

      it('adds errors for invalid values', () => {
        const result1 = collection.validate(getFormData(['invalid']))
        const result2 = collection.validate(
          // @ts-expect-error - Allow invalid param for test
          getFormData({ unknown: 'invalid' })
        )

        expect(result1.errors).toBeTruthy()
        expect(result2.errors).toBeTruthy()
      })
    })

    describe('State', () => {
      it('returns text from state', () => {
        const state1 = getFormState('Textarea')
        const state2 = getFormState(null)

        const text1 = component.getDisplayStringFromState(state1)
        const text2 = component.getDisplayStringFromState(state2)

        expect(text1).toBe('Textarea')
        expect(text2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState('Textarea')
        const state2 = getFormState(null)

        const payload1 = component.getFormDataFromState(state1)
        const payload2 = component.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData('Textarea'))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState('Textarea')
        const state2 = getFormState(null)

        const value1 = component.getFormValueFromState(state1)
        const value2 = component.getFormValueFromState(state2)

        expect(value1).toBe('Textarea')
        expect(value2).toBeUndefined()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData('Textarea')
        const payload2 = getFormData()

        const value1 = component.getStateFromValidForm(payload1)
        const value2 = component.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState('Textarea'))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = component.getViewModel(getFormData('Textarea'))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: 'Textarea'
          })
        )
      })

      it('sets Nunjucks component isCharacterOrWordCount: true', () => {
        const componentCustom1 = new MultilineTextField(
          { ...def, options: { maxWords: 10 } },
          { model }
        )

        const componentCustom2 = new MultilineTextField(
          { ...def, schema: { max: 10 } },
          { model }
        )

        const viewModel = component.getViewModel(getFormData('Textarea'))

        const viewModel1 = componentCustom1.getViewModel(
          getFormData('Textarea custom #1')
        )

        const viewModel2 = componentCustom2.getViewModel(
          getFormData('Textarea custom #2')
        )

        expect(viewModel).toEqual(
          expect.objectContaining({ isCharacterOrWordCount: false })
        )

        expect(viewModel1).toEqual(
          expect.objectContaining({ isCharacterOrWordCount: true })
        )

        expect(viewModel2).toEqual(
          expect.objectContaining({ isCharacterOrWordCount: true })
        )
      })
    })
  })

  describe('Validation', () => {
    describe.each([
      {
        description: 'Trim empty spaces',
        component: {
          title: 'Example textarea',
          name: 'myComponent',
          type: ComponentType.MultilineTextField,
          options: {},
          schema: {}
        } satisfies MultilineTextFieldComponent,
        assertions: [
          {
            input: getFormData('  Leading spaces'),
            output: { value: getFormData('Leading spaces') }
          },
          {
            input: getFormData('Trailing spaces  '),
            output: { value: getFormData('Trailing spaces') }
          },
          {
            input: getFormData('  Mixed spaces and new lines \n\n'),
            output: { value: getFormData('Mixed spaces and new lines') }
          }
        ]
      },
      {
        description: 'Option max words',
        component: {
          title: 'Example textarea',
          name: 'myComponent',
          type: ComponentType.MultilineTextField,
          options: {
            maxWords: 2
          },
          schema: {}
        } satisfies MultilineTextFieldComponent,
        assertions: [
          {
            input: getFormData('Textarea words'),
            output: {
              value: getFormData('Textarea words')
            }
          },
          {
            input: getFormData('Textarea too many words'),
            output: {
              value: getFormData('Textarea too many words'),
              errors: [
                expect.objectContaining({
                  text: 'Example textarea must be 2 words or fewer'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Schema min and max',
        component: {
          title: 'Example textarea',
          name: 'myComponent',
          type: ComponentType.MultilineTextField,
          options: {},
          schema: {
            min: 5,
            max: 8
          }
        } satisfies MultilineTextFieldComponent,
        assertions: [
          {
            input: getFormData('Text'),
            output: {
              value: getFormData('Text'),
              errors: [
                expect.objectContaining({
                  text: 'Example textarea must be 5 characters or more'
                })
              ]
            }
          },
          {
            input: getFormData('Textarea too long'),
            output: {
              value: getFormData('Textarea too long'),
              errors: [
                expect.objectContaining({
                  text: 'Example textarea must be 8 characters or less'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Schema length',
        component: {
          title: 'Example textarea',
          name: 'myComponent',
          type: ComponentType.MultilineTextField,
          options: {},
          schema: {
            length: 4
          }
        } satisfies MultilineTextFieldComponent,
        assertions: [
          {
            input: getFormData('Text'),
            output: { value: getFormData('Text') }
          },
          {
            input: getFormData('Textarea'),
            output: {
              value: getFormData('Textarea'),
              errors: [
                expect.objectContaining({
                  text: 'Example textarea length must be 4 characters long'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Schema regex',
        component: {
          title: 'Example textarea',
          name: 'myComponent',
          type: ComponentType.MultilineTextField,
          options: {},
          schema: {
            regex: '^[a-zA-Z]{1,2}\\d[a-zA-Z\\d]?\\s?\\d[a-zA-Z]{2}$'
          }
        } satisfies MultilineTextFieldComponent,
        assertions: [
          {
            input: getFormData('SW1P'),
            output: {
              value: getFormData('SW1P'),
              errors: [
                expect.objectContaining({
                  text: 'Enter a valid example textarea'
                })
              ]
            }
          },
          {
            input: getFormData('SW1P 4DF'),
            output: { value: getFormData('SW1P 4DF') }
          }
        ]
      },
      {
        description: 'Custom validation message',
        component: {
          title: 'Example textarea',
          name: 'myComponent',
          type: ComponentType.MultilineTextField,
          options: {
            customValidationMessage: 'This is a custom error',
            customValidationMessages: {
              'any.required': 'This is not used',
              'string.empty': 'This is not used',
              'string.max': 'This is not used',
              'string.min': 'This is not used'
            }
          },
          schema: {
            min: 5,
            max: 8
          }
        } satisfies MultilineTextFieldComponent,
        assertions: [
          {
            input: getFormData(),
            output: {
              value: getFormData(''),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom error'
                })
              ]
            }
          },
          {
            input: getFormData(''),
            output: {
              value: getFormData(''),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom error'
                })
              ]
            }
          },
          {
            input: getFormData('Text'),
            output: {
              value: getFormData('Text'),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom error'
                })
              ]
            }
          },
          {
            input: getFormData('Textarea too long'),
            output: {
              value: getFormData('Textarea too long'),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom error'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Custom validation messages (multiple)',
        component: {
          title: 'Example textarea',
          name: 'myComponent',
          type: ComponentType.MultilineTextField,
          options: {
            customValidationMessages: {
              'any.required': 'This is a custom required error',
              'string.empty': 'This is a custom empty string error',
              'string.max': 'This is a custom max length error',
              'string.min': 'This is a custom min length error'
            }
          },
          schema: {
            min: 5,
            max: 8
          }
        } satisfies MultilineTextFieldComponent,
        assertions: [
          {
            input: getFormData(),
            output: {
              value: getFormData(''),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom required error'
                })
              ]
            }
          },
          {
            input: getFormData(''),
            output: {
              value: getFormData(''),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom empty string error'
                })
              ]
            }
          },
          {
            input: getFormData('Text'),
            output: {
              value: getFormData('Text'),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom min length error'
                })
              ]
            }
          },
          {
            input: getFormData('Textarea too long'),
            output: {
              value: getFormData('Textarea too long'),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom max length error'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Optional field',
        component: {
          title: 'Example textarea',
          name: 'myComponent',
          type: ComponentType.MultilineTextField,
          options: {
            required: false
          },
          schema: {}
        } satisfies MultilineTextFieldComponent,
        assertions: [
          {
            input: getFormData(''),
            output: { value: getFormData('') }
          }
        ]
      }
    ])('$description', ({ component: def, assertions }) => {
      let collection: ComponentCollection

      beforeEach(() => {
        collection = new ComponentCollection([def], { model })
      })

      it.each([...assertions])(
        'validates custom example',
        ({ input, output }) => {
          const result = collection.validate(input)
          expect(result).toEqual(output)
        }
      )
    })
  })
})
