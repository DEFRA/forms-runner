import {
  ComponentType,
  type FormDefinition,
  type MultilineTextFieldComponent
} from '@defra/forms-model'

import { MultilineTextField } from '~/src/server/plugins/engine/components/MultilineTextField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('MultilineTextField', () => {
  const definition = {
    pages: [],
    lists: [],
    sections: [],
    conditions: []
  } satisfies FormDefinition

  let formModel: FormModel

  beforeEach(() => {
    formModel = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: MultilineTextFieldComponent
    let component: MultilineTextField
    let label: string

    beforeEach(() => {
      def = {
        title: 'Example textarea',
        name: 'myComponent',
        type: ComponentType.MultilineTextField,
        options: {},
        schema: {}
      } satisfies MultilineTextFieldComponent

      component = new MultilineTextField(def, formModel)
      label = def.title.toLowerCase()
    })

    describe('Schema', () => {
      it('uses component title as label', () => {
        const { formSchema } = component

        expect(formSchema.describe().flags).toEqual(
          expect.objectContaining({ label })
        )
      })

      it('is required by default', () => {
        const { formSchema } = component

        expect(formSchema.describe().flags).toEqual(
          expect.objectContaining({
            presence: 'required'
          })
        )
      })

      it('is optional when configured', () => {
        const componentOptional = new MultilineTextField(
          { ...def, options: { required: false } },
          formModel
        )

        const { formSchema } = componentOptional

        expect(formSchema.describe()).toEqual(
          expect.objectContaining({
            allow: ['']
          })
        )

        const result = formSchema.validate('', opts)
        expect(result.error).toBeUndefined()
      })

      it('accepts valid values', () => {
        const { formSchema } = component

        const result1 = formSchema.validate('Text', opts)
        const result2 = formSchema.validate('Textarea', opts)

        expect(result1.error).toBeUndefined()
        expect(result2.error).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const { formSchema } = component

        const result = formSchema.validate('', opts)

        expect(result.error).toEqual(
          expect.objectContaining({
            message: `Enter ${label}`
          })
        )
      })

      it('adds errors for invalid values', () => {
        const { formSchema } = component

        const result1 = formSchema.validate(['invalid'], opts)
        const result2 = formSchema.validate({ unknown: 'invalid' }, opts)

        expect(result1.error).toBeTruthy()
        expect(result2.error).toBeTruthy()
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
          formModel
        )

        const componentCustom2 = new MultilineTextField(
          { ...def, schema: { max: 10 } },
          formModel
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
            input: '  Leading spaces',
            output: { value: 'Leading spaces' }
          },
          {
            input: 'Trailing spaces  ',
            output: { value: 'Trailing spaces' }
          },
          {
            input: '  Mixed spaces and new lines \n\n',
            output: { value: 'Mixed spaces and new lines' }
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
            input: 'Textarea words',
            output: {
              value: 'Textarea words'
            }
          },
          {
            input: 'Textarea too many words',
            output: {
              value: 'Textarea too many words',
              error: new Error('example textarea must be 2 words or fewer')
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
            input: 'Text',
            output: {
              value: 'Text',
              error: new Error('example textarea must be 5 characters or more')
            }
          },
          {
            input: 'Textarea too long',
            output: {
              value: 'Textarea too long',
              error: new Error('example textarea must be 8 characters or less')
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
            input: 'Text',
            output: { value: 'Text' }
          },
          {
            input: 'Textarea',
            output: {
              value: 'Textarea',
              error: new Error(
                'example textarea length must be 4 characters long'
              )
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
            input: 'SW1P',
            output: {
              value: 'SW1P',
              error: new Error('Enter a valid example textarea')
            }
          },
          {
            input: 'SW1P 4DF',
            output: { value: 'SW1P 4DF' }
          }
        ]
      },
      {
        description: 'Custom validation',
        component: {
          title: 'Example textarea',
          name: 'myComponent',
          type: ComponentType.MultilineTextField,
          options: {
            customValidationMessage: 'This is a custom error'
          },
          schema: {}
        } satisfies MultilineTextFieldComponent,
        assertions: [
          {
            input: '',
            output: {
              value: '',
              error: new Error('This is a custom error')
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
            input: '',
            output: { value: '' }
          }
        ]
      }
    ])('$description', ({ component: def, assertions }) => {
      let component: MultilineTextField

      beforeEach(() => {
        component = new MultilineTextField(def, formModel)
      })

      it.each([...assertions])(
        'validates custom example',
        ({ input, output }) => {
          const { formSchema } = component

          const result = formSchema.validate(input, opts)
          expect(result).toEqual(output)
        }
      )
    })
  })
})
