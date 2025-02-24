import { ComponentType, type NumberFieldComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { NumberField } from '~/src/server/plugins/engine/components/NumberField.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('NumberField', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: NumberFieldComponent
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example number field',
        name: 'myComponent',
        type: ComponentType.NumberField,
        options: {},
        schema: {}
      } satisfies NumberFieldComponent

      collection = new ComponentCollection([def], { model })
      field = collection.fields[0]
    })

    describe('Schema', () => {
      it('uses component title as label', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              label: 'Example number field'
            })
          })
        )
      })

      it('uses component name as keys', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(field.keys).toEqual(['myComponent'])
        expect(field.collection).toBeUndefined()

        for (const key of field.keys) {
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
        const result1 = collection.validate(getFormData('1'))
        const result2 = collection.validate(getFormData('10'))
        const result3 = collection.validate(getFormData('2024'))
        const result4 = collection.validate(getFormData(' 2020'))

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeUndefined()
        expect(result3.errors).toBeUndefined()
        expect(result4.errors).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(getFormData(''))

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Enter example number field'
          })
        ])

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Enter example number field'
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
        const state1 = getFormState(2024)
        const state2 = getFormState(null)

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe('2024')
        expect(answer2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState(2024)
        const state2 = getFormState(null)

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData(2024))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState(2024)
        const state2 = getFormState(null)

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toBe(2024)
        expect(value2).toBeUndefined()
      })

      it('returns context for conditions and form submission', () => {
        const state1 = getFormState(2024)
        const state2 = getFormState(null)

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)

        expect(value1).toBe(2024)
        expect(value2).toBeNull()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData(2024)
        const payload2 = getFormData()

        const value1 = field.getStateFromValidForm(payload1)
        const value2 = field.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState(2024))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = field.getViewModel(getFormData(2024))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: 2024
          })
        )
      })

      it('sets Nunjucks component prefix and suffix', () => {
        const componentCustom = new NumberField(
          { ...def, options: { prefix: '£', suffix: 'per item' } },
          { model }
        )

        const viewModel = componentCustom.getViewModel(getFormData(99.99))

        expect(viewModel.prefix).toEqual({ text: '£' })
        expect(viewModel.suffix).toEqual({ text: 'per item' })
      })

      it('sets Nunjucks component inputmode attribute when precision is not defined', () => {
        const componentCustom = new NumberField(
          { ...def, schema: { precision: undefined } },
          { model }
        )

        const viewModel = componentCustom.getViewModel(getFormData(99))

        expect(viewModel.attributes).toHaveProperty('inputmode', 'numeric')
      })

      it('sets Nunjucks component inputmode attribute when precision is 0', () => {
        const componentCustom = new NumberField(
          { ...def, schema: { precision: 0 } },
          { model }
        )

        const viewModel = componentCustom.getViewModel(getFormData(99))

        expect(viewModel.attributes).toHaveProperty('inputmode', 'numeric')
      })

      it('does not set Nunjucks component inputmode attribute when precision is positive', () => {
        const componentCustom = new NumberField(
          { ...def, schema: { precision: 2 } },
          { model }
        )

        const viewModel = componentCustom.getViewModel(getFormData(99.99))

        expect(viewModel.attributes).not.toHaveProperty('inputmode', 'numeric')
      })
    })

    it('sets Nunjucks component value when invalid', () => {
      const viewModel = field.getViewModel(getFormData('AA'))

      expect(viewModel).toHaveProperty('value', 'AA')
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
            input: getFormData('  2024'),
            output: { value: getFormData(2024) }
          },
          {
            input: getFormData('2024  '),
            output: { value: getFormData(2024) }
          },
          {
            input: getFormData('  2024 \n\n'),
            output: { value: getFormData(2024) }
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
            input: getFormData('Not a number'),
            output: {
              value: getFormData('Not a number'),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be a number'
                })
              ]
            }
          },
          {
            input: getFormData('£99.99'),
            output: {
              value: getFormData('£99.99'),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be a number'
                })
              ]
            }
          },
          {
            input: getFormData('100.55'),
            output: { value: getFormData(100.55) }
          },
          {
            input: getFormData('3.14159'),
            output: { value: getFormData(3.14159) }
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
            input: getFormData('3.14159'),
            output: {
              value: getFormData(3.14159),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be a whole number'
                })
              ]
            }
          },
          {
            input: getFormData('3'),
            output: { value: getFormData(3) }
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
            input: getFormData('3.14159'),
            output: {
              value: getFormData(3.14159),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be a whole number'
                })
              ]
            }
          },
          {
            input: getFormData('3'),
            output: { value: getFormData(3) }
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
            input: getFormData('3.14159'),
            output: {
              value: getFormData(3.14159),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must have 1 or fewer decimal places'
                })
              ]
            }
          },
          {
            input: getFormData('3.1'),
            output: { value: getFormData(3.1) }
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
            input: getFormData('3.14159'),
            output: {
              value: getFormData(3.14159),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must have 2 or fewer decimal places'
                })
              ]
            }
          },
          {
            input: getFormData('3.1'),
            output: { value: getFormData(3.1) }
          },
          {
            input: getFormData('3.14'),
            output: { value: getFormData(3.14) }
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
            input: getFormData('64811494532973582'),
            output: {
              value: getFormData(64811494532973580),
              errors: [
                expect.objectContaining({
                  text: 'Enter example number field in the correct format'
                })
              ]
            }
          },
          {
            input: getFormData('3.1'),
            output: { value: getFormData(3.1) }
          },
          {
            input: getFormData('3.14'),
            output: { value: getFormData(3.14) }
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
            input: getFormData('4'),
            output: {
              value: getFormData(4),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be 5 or higher'
                })
              ]
            }
          },
          {
            input: getFormData('10'),
            output: {
              value: getFormData(10),
              errors: [
                expect.objectContaining({
                  text: 'Example number field must be 8 or lower'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Custom validation message',
        component: {
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {
            customValidationMessage: 'This is a custom error',
            customValidationMessages: {
              'any.required': 'This is not used',
              'number.base': 'This is not used',
              'number.min': 'This is not used',
              'number.max': 'This is not used'
            }
          },
          schema: {}
        } satisfies NumberFieldComponent,
        assertions: [
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
            input: getFormData('AA'),
            output: {
              value: getFormData('AA'),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom error'
                })
              ]
            }
          },
          {
            input: getFormData('invalid'),
            output: {
              value: getFormData('invalid'),
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
          title: 'Example number field',
          name: 'myComponent',
          type: ComponentType.NumberField,
          options: {
            customValidationMessages: {
              'any.required': 'This is a custom required error',
              'number.base': 'This is a custom number error',
              'number.max': 'This is a custom max number error',
              'number.min': 'This is a custom min number error'
            }
          },
          schema: {
            min: 5,
            max: 8
          }
        } satisfies NumberFieldComponent,
        assertions: [
          {
            input: getFormData(''),
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
            input: getFormData('AA'),
            output: {
              value: getFormData('AA'),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom number error'
                })
              ]
            }
          },
          {
            input: getFormData('4'),
            output: {
              value: getFormData(4),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom min number error'
                })
              ]
            }
          },
          {
            input: getFormData('10'),
            output: {
              value: getFormData(10),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom max number error'
                })
              ]
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
            input: getFormData('3.14159'),
            output: {
              value: getFormData(3.14159),
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
