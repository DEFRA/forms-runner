import {
  ComponentType,
  type FormDefinition,
  type NumberFieldComponent
} from '@defra/forms-model'

import { NumberField } from '~/src/server/plugins/engine/components/NumberField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

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
            message: `${label} must be a number`
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
      it('returns text from state value', () => {
        const text = component.getDisplayStringFromState({
          [def.name]: 2024
        })

        expect(text).toBe('2024')
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = component.getViewModel({
          [def.name]: '2024'
        })

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: '2024',
            type: 'number'
          })
        )
      })

      it('sets Nunjucks component prefix and suffix', () => {
        const componentCustom = new NumberField(
          { ...def, options: { prefix: '£', suffix: 'per item' } },
          formModel
        )

        const viewModel = componentCustom.getViewModel({
          [def.name]: '99.99'
        })

        expect(viewModel.prefix).toEqual({ text: '£' })
        expect(viewModel.suffix).toEqual({ text: 'per item' })
      })

      it('sets Nunjucks component step attribute', () => {
        const componentCustom = new NumberField(
          { ...def, schema: { precision: 2 } },
          formModel
        )

        const viewModel = componentCustom.getViewModel({
          [def.name]: '99.99'
        })

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
      }
    ])('$description', ({ component: def, assertions }) => {
      let component: NumberField
      let label: string

      beforeEach(() => {
        component = new NumberField(def, formModel)
        label = def.title.toLowerCase()
      })

      it('validates empty value', () => {
        const { formSchema } = component

        const input = ''
        const output = {
          value: '',
          error: new Error(`${label} must be a number`)
        }

        const result = formSchema.validate(input, opts)
        expect(result).toEqual(output)
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
