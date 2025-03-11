import {
  ComponentType,
  type TelephoneNumberFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('TelephoneNumberField', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: TelephoneNumberFieldComponent
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example telephone number field',
        name: 'myComponent',
        type: ComponentType.TelephoneNumberField,
        options: {}
      } satisfies TelephoneNumberFieldComponent

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
              label: 'Example telephone number field'
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

      it.each([
        '+111-111-11',
        '+111 111 11',
        '+11111111',
        '+44 7930 111 222',
        '07930 111 222',
        '01606 76543',
        '01606 765432',
        '0203 765 443',
        '0800 123 321',
        '(01606) 765432',
        '(01606) 765-432',
        '01606 765-432',
        '+44203-765-443',
        '0800123-321',
        '0800-123-321'
      ])("accepts valid value '%s'", (value) => {
        const result = collection.validate(getFormData(value))
        expect(result.errors).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(getFormData(''))

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Enter example telephone number field'
          })
        ])
      })

      it('adds errors for invalid values', () => {
        const result1 = collection.validate(getFormData('invalid'))
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
        const state1 = getFormState('+447900000000')
        const state2 = getFormState(null)

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe('+447900000000')
        expect(answer2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState('+447900000000')
        const state2 = getFormState(null)

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData('+447900000000'))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState('+447900000000')
        const state2 = getFormState(null)

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toBe('+447900000000')
        expect(value2).toBeUndefined()
      })

      it('returns context for conditions and form submission', () => {
        const state1 = getFormState('+447900000000')
        const state2 = getFormState(null)

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)

        expect(value1).toBe('+447900000000')
        expect(value2).toBeNull()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData('+447900000000')
        const payload2 = getFormData()

        const value1 = field.getStateFromValidForm(payload1)
        const value2 = field.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState('+447900000000'))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = field.getViewModel(
          getFormData('Telephone number field')
        )

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: 'Telephone number field',
            attributes: { autocomplete: 'tel' },
            type: 'tel'
          })
        )
      })
    })
  })

  describe('Validation', () => {
    describe.each([
      {
        description: 'Custom validation message',
        component: {
          title: 'Example telephone number field',
          name: 'myComponent',
          type: ComponentType.TelephoneNumberField,
          options: {
            customValidationMessage: 'This is a custom error',
            customValidationMessages: {
              'any.required': 'This is not used',
              'string.empty': 'This is not used',
              'string.pattern.base': 'This is not used'
            }
          }
        } satisfies TelephoneNumberFieldComponent,
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
            input: getFormData('AA'),
            output: {
              value: getFormData('AA'),
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
          title: 'Example telephone number field',
          name: 'myComponent',
          type: ComponentType.TelephoneNumberField,
          options: {
            customValidationMessages: {
              'any.required': 'This is a custom required error',
              'string.empty': 'This is a custom empty string error',
              'string.pattern.base': 'This is a custom pattern error'
            }
          }
        } satisfies TelephoneNumberFieldComponent,
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
            input: getFormData('AA'),
            output: {
              value: getFormData('AA'),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom pattern error'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Optional field',
        component: {
          title: 'Example telephone number field',
          name: 'myComponent',
          type: ComponentType.TelephoneNumberField,
          options: {
            required: false
          }
        } satisfies TelephoneNumberFieldComponent,
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
