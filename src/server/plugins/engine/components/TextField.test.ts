import {
  ComponentType,
  type FormDefinition,
  type TextFieldComponent
} from '@defra/forms-model'

import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('TextField', () => {
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
    let def: TextFieldComponent
    let component: TextField
    let label: string

    beforeEach(() => {
      def = {
        title: 'Example text field',
        name: 'myComponent',
        type: ComponentType.TextField,
        options: {},
        schema: {}
      } satisfies TextFieldComponent

      component = new TextField(def, formModel)
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
        const componentOptional = new TextField(
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
        const result2 = formSchema.validate('Text field', opts)

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
        const state1 = getFormState('Text field')
        const state2 = getFormState(null)

        const text1 = component.getDisplayStringFromState(state1)
        const text2 = component.getDisplayStringFromState(state2)

        expect(text1).toBe('Text field')
        expect(text2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState('Text field')
        const state2 = getFormState(null)

        const payload1 = component.getFormDataFromState(state1)
        const payload2 = component.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData('Text field'))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState('Text field')
        const state2 = getFormState(null)

        const value1 = component.getFormValueFromState(state1)
        const value2 = component.getFormValueFromState(state2)

        expect(value1).toBe('Text field')
        expect(value2).toBeUndefined()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData('Text field')
        const payload2 = getFormData()

        const value1 = component.getStateFromValidForm(payload1)
        const value2 = component.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState('Text field'))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = component.getViewModel(getFormData('Text field'))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: 'Text field'
          })
        )
      })
    })
  })

  describe('Validation', () => {
    describe.each([
      {
        description: 'Trim empty spaces',
        component: {
          title: 'Example text field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {},
          schema: {}
        } satisfies TextFieldComponent,
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
        description: 'Schema min and max',
        component: {
          title: 'Example text field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {},
          schema: {
            min: 5,
            max: 8
          }
        } satisfies TextFieldComponent,
        assertions: [
          {
            input: 'Text',
            output: {
              value: 'Text',
              error: new Error(
                'example text field must be 5 characters or more'
              )
            }
          },
          {
            input: 'Text field',
            output: {
              value: 'Text field',
              error: new Error(
                'example text field must be 8 characters or less'
              )
            }
          }
        ]
      },
      {
        description: 'Schema length',
        component: {
          title: 'Example text field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {},
          schema: {
            length: 4
          }
        } satisfies TextFieldComponent,
        assertions: [
          {
            input: 'Text',
            output: { value: 'Text' }
          },
          {
            input: 'Text field',
            output: {
              value: 'Text field',
              error: new Error(
                'example text field length must be 4 characters long'
              )
            }
          }
        ]
      },
      {
        description: 'Schema regex',
        component: {
          title: 'Example text field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {},
          schema: {
            regex: '^[a-zA-Z]{1,2}\\d[a-zA-Z\\d]?\\s?\\d[a-zA-Z]{2}$'
          }
        } satisfies TextFieldComponent,
        assertions: [
          {
            input: 'SW1P',
            output: {
              value: 'SW1P',
              error: new Error('Enter a valid example text field')
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
          title: 'Example text field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {
            customValidationMessage: 'This is a custom error'
          },
          schema: {}
        } satisfies TextFieldComponent,
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
          title: 'Example text field',
          name: 'myComponent',
          type: ComponentType.TextField,
          options: {
            required: false
          },
          schema: {}
        } satisfies TextFieldComponent,
        assertions: [
          {
            input: '',
            output: { value: '' }
          }
        ]
      }
    ])('$description', ({ component: def, assertions }) => {
      let component: TextField

      beforeEach(() => {
        component = new TextField(def, formModel)
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
