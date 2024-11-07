import {
  ComponentType,
  type FormDefinition,
  type NumberFieldComponent
} from '@defra/forms-model'

import { NumberField } from '~/src/server/plugins/engine/components/NumberField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('NumberField', () => {
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
    let def: NumberFieldComponent
    let component: NumberField
    let label: string

    beforeEach(() => {
      def = {
        title: 'Example number field',
        name: 'myComponent',
        type: ComponentType.NumberField,
        options: {},
        schema: {}
      } satisfies NumberFieldComponent

      component = new NumberField(def, formModel)
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
        const componentOptional = new NumberField(
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

        const result1 = formSchema.validate('1', opts)
        const result2 = formSchema.validate('10', opts)
        const result3 = formSchema.validate('2024', opts)
        const result4 = formSchema.validate(' 2020 ', opts)

        expect(result1.error).toBeUndefined()
        expect(result2.error).toBeUndefined()
        expect(result3.error).toBeUndefined()
        expect(result4.error).toBeUndefined()
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
        const state1 = getFormState(2024)
        const state2 = getFormState(null)

        const text1 = component.getDisplayStringFromState(state1)
        const text2 = component.getDisplayStringFromState(state2)

        expect(text1).toBe('2024')
        expect(text2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState(2024)
        const state2 = getFormState(null)

        const payload1 = component.getFormDataFromState(state1)
        const payload2 = component.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData(2024))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState(2024)
        const state2 = getFormState(null)

        const value1 = component.getFormValueFromState(state1)
        const value2 = component.getFormValueFromState(state2)

        expect(value1).toBe(2024)
        expect(value2).toBeUndefined()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData(2024)
        const payload2 = getFormData()

        const value1 = component.getStateFromValidForm(payload1)
        const value2 = component.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState(2024))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = component.getViewModel(getFormData(2024))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: 2024,
            type: 'number'
          })
        )
      })

      it('sets Nunjucks component prefix and suffix', () => {
        const componentCustom = new NumberField(
          { ...def, options: { prefix: '£', suffix: 'per item' } },
          formModel
        )

        const viewModel = componentCustom.getViewModel(getFormData(99.99))

        expect(viewModel.prefix).toEqual({ text: '£' })
        expect(viewModel.suffix).toEqual({ text: 'per item' })
      })

      it('sets Nunjucks component step attribute', () => {
        const componentCustom = new NumberField(
          { ...def, schema: { precision: 2 } },
          formModel
        )

        const viewModel = componentCustom.getViewModel(getFormData(99.99))

        expect(viewModel.attributes).toEqual(
          expect.objectContaining({
            step: '0.01'
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
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {}
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: '  2024',
            output: { value: 2024 }
          },
          {
            input: '2024  ',
            output: { value: 2024 }
          },
          {
            input: '  2024 \n\n',
            output: { value: 2024 }
          }
        ]
      },
      {
        description: 'Number validation',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {}
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: 'Not a number',
            output: {
              value: 'Not a number',
              error: new Error('example number field must be a number')
            }
          },
          {
            input: '£99.99',
            output: {
              value: '£99.99',
              error: new Error('example number field must be a number')
            }
          },
          {
            input: '100.55',
            output: { value: 100.55 }
          },
          {
            input: '3.14159',
            output: { value: 3.14159 }
          }
        ]
      },
      {
        description: 'Schema precision (integers only)',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {
            precision: 0
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: '3.14159',
            output: {
              value: 3.14159,
              error: new Error('example number field must be a whole number')
            }
          },
          {
            input: '3',
            output: { value: 3 }
          }
        ]
      },
      {
        description: 'Schema precision (integers only when negative)',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {
            precision: -1
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: '3.14159',
            output: {
              value: 3.14159,
              error: new Error('example number field must be a whole number')
            }
          },
          {
            input: '3',
            output: { value: 3 }
          }
        ]
      },
      {
        description: 'Schema precision (1 decimal place)',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {
            precision: 1
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: '3.14159',
            output: {
              value: 3.14159,
              error: new Error(
                'example number field must have 1 or fewer decimal places'
              )
            }
          },
          {
            input: '3.1',
            output: { value: 3.1 }
          }
        ]
      },
      {
        description: 'Schema precision (2 decimal places)',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {
            precision: 2
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: '3.14159',
            output: {
              value: 3.14159,
              error: new Error(
                'example number field must have 2 or fewer decimal places'
              )
            }
          },
          {
            input: '3.1',
            output: { value: 3.1 }
          },
          {
            input: '3.14',
            output: { value: 3.14 }
          }
        ]
      },
      {
        description: 'Schema precision with unsafe numbers',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {
            precision: 2
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: '64811494532973582',
            output: {
              value: 64811494532973580,
              error: new Error(
                'Enter example number field in the correct format'
              )
            }
          },
          {
            input: '3.1',
            output: { value: 3.1 }
          },
          {
            input: '3.14',
            output: { value: 3.14 }
          }
        ]
      },
      {
        description: 'Schema min and max',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {},
          schema: {
            min: 5,
            max: 8
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: '4',
            output: {
              value: 4,
              error: new Error('example number field must be 5 or higher')
            }
          },
          {
            input: '10',
            output: {
              value: 10,
              error: new Error('example number field must be 8 or lower')
            }
          }
        ]
      },
      {
        description: 'Custom validation',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {
            customValidationMessage: 'This is a custom error'
          },
          schema: {}
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: 'invalid',
            output: {
              value: 'invalid',
              error: new Error('This is a custom error')
            }
          }
        ]
      },
      {
        description: 'Custom validation overrides schema precision message',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {
            customValidationMessage: 'This is a custom error'
          },
          schema: {
            precision: 2
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: '3.14159',
            output: {
              value: 3.14159,
              error: new Error('This is a custom error')
            }
          }
        ]
      },
      {
        description: 'Optional field',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {
            required: false
          },
          schema: {}
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: '',
            output: { value: '' }
          }
        ]
      }
    ])('$description', ({ component: def, assertions }) => {
      let component: NumberField

      beforeEach(() => {
        component = new NumberField(def, formModel)
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
