import {
  ComponentType,
  type EmailAddressFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/blank.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('EmailAddressField', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: EmailAddressFieldComponent
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example email address field',
        name: 'myComponent',
        type: ComponentType.EmailAddressField,
        options: {}
      } satisfies EmailAddressFieldComponent

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
              label: 'Example email address field'
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
        const result1 = collection.validate(
          getFormData('defra.helpline@defra.gov.uk')
        )

        const result2 = collection.validate(getFormData('helpline@food.gov.uk'))

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(getFormData(''))

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Enter example email address field'
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
        const state1 = getFormState('defra.helpline@defra.gov.uk')
        const state2 = getFormState(null)

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe('defra.helpline@defra.gov.uk')
        expect(answer2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState('defra.helpline@defra.gov.uk')
        const state2 = getFormState(null)

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData('defra.helpline@defra.gov.uk'))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState('defra.helpline@defra.gov.uk')
        const state2 = getFormState(null)

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toBe('defra.helpline@defra.gov.uk')
        expect(value2).toBeUndefined()
      })

      it('returns context for conditions and form submission', () => {
        const state1 = getFormState('defra.helpline@defra.gov.uk')
        const state2 = getFormState(null)

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)

        expect(value1).toBe('defra.helpline@defra.gov.uk')
        expect(value2).toBeNull()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData('defra.helpline@defra.gov.uk')
        const payload2 = getFormData()

        const value1 = field.getStateFromValidForm(payload1)
        const value2 = field.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState('defra.helpline@defra.gov.uk'))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = field.getViewModel(
          getFormData('defra.helpline@defra.gov.uk')
        )

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: 'defra.helpline@defra.gov.uk',
            type: 'email',
            attributes: { autocomplete: 'email' }
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
          title: 'Example email address field',
          name: 'myComponent',
          type: ComponentType.EmailAddressField,
          options: {}
        } satisfies EmailAddressFieldComponent,
        assertions: [
          {
            input: getFormData('  defra.helpline@defra.gov.uk'),
            output: { value: getFormData('defra.helpline@defra.gov.uk') }
          },
          {
            input: getFormData('defra.helpline@defra.gov.uk  '),
            output: { value: getFormData('defra.helpline@defra.gov.uk') }
          },
          {
            input: getFormData('  defra.helpline@defra.gov.uk \n\n'),
            output: { value: getFormData('defra.helpline@defra.gov.uk') }
          }
        ]
      },
      {
        description: 'Email address validation',
        component: {
          title: 'Example email address field',
          name: 'myComponent',
          type: ComponentType.EmailAddressField,
          options: {}
        } satisfies EmailAddressFieldComponent,
        assertions: [
          {
            input: getFormData('defra.helpline'),
            output: {
              value: getFormData('defra.helpline'),
              errors: [
                expect.objectContaining({
                  text: 'Enter example email address field in the correct format'
                })
              ]
            }
          },
          {
            input: getFormData('defra.helpline@defra'),
            output: {
              value: getFormData('defra.helpline@defra'),
              errors: [
                expect.objectContaining({
                  text: 'Enter example email address field in the correct format'
                })
              ]
            }
          },
          {
            input: getFormData('defra.helpline@defra.gov.uk'),
            output: { value: getFormData('defra.helpline@defra.gov.uk') }
          }
        ]
      },
      {
        description: 'Custom validation message',
        component: {
          title: 'Example email address field',
          name: 'myComponent',
          type: ComponentType.EmailAddressField,
          options: {
            customValidationMessage: 'This is a custom error',
            customValidationMessages: {
              'any.required': 'This is not used',
              'string.empty': 'This is not used',
              'string.email': 'This is not used'
            }
          }
        } satisfies EmailAddressFieldComponent,
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
          title: 'Example email address field',
          name: 'myComponent',
          type: ComponentType.EmailAddressField,
          options: {
            customValidationMessages: {
              'any.required': 'This is a custom required error',
              'string.empty': 'This is a custom empty string error',
              'string.email': 'This is a custom invalid email error'
            }
          }
        } satisfies EmailAddressFieldComponent,
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
            input: getFormData('invalid'),
            output: {
              value: getFormData('invalid'),
              errors: [
                expect.objectContaining({
                  text: 'This is a custom invalid email error'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Optional field',
        component: {
          title: 'Example email address field',
          name: 'myComponent',
          type: ComponentType.EmailAddressField,
          options: {
            required: false
          }
        } satisfies EmailAddressFieldComponent,
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
