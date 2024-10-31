import {
  ComponentType,
  type EmailAddressFieldComponent,
  type FormDefinition
} from '@defra/forms-model'

import { EmailAddressField } from '~/src/server/plugins/engine/components/EmailAddressField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('EmailAddressField', () => {
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
    let def: EmailAddressFieldComponent
    let component: EmailAddressField
    let label: string

    beforeEach(() => {
      def = {
        title: 'Example email address field',
        name: 'myComponent',
        type: ComponentType.EmailAddressField,
        options: {}
      } satisfies EmailAddressFieldComponent

      component = new EmailAddressField(def, formModel)
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
        const componentOptional = new EmailAddressField(
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

        const result1 = formSchema.validate('defra.helpline@defra.gov.uk', opts)
        const result2 = formSchema.validate('helpline@food.gov.uk', opts)

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
        const state1 = getFormState('defra.helpline@defra.gov.uk')
        const state2 = getFormState(null)

        const text1 = component.getDisplayStringFromState(state1)
        const text2 = component.getDisplayStringFromState(state2)

        expect(text1).toBe('defra.helpline@defra.gov.uk')
        expect(text2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState('defra.helpline@defra.gov.uk')
        const state2 = getFormState(null)

        const payload1 = component.getFormDataFromState(state1)
        const payload2 = component.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData('defra.helpline@defra.gov.uk'))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState('defra.helpline@defra.gov.uk')
        const state2 = getFormState(null)

        const value1 = component.getFormValueFromState(state1)
        const value2 = component.getFormValueFromState(state2)

        expect(value1).toBe('defra.helpline@defra.gov.uk')
        expect(value2).toBeUndefined()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData('defra.helpline@defra.gov.uk')
        const payload2 = getFormData()

        const value1 = component.getStateFromValidForm(payload1)
        const value2 = component.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState('defra.helpline@defra.gov.uk'))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = component.getViewModel(
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
            input: '  defra.helpline@defra.gov.uk',
            output: { value: 'defra.helpline@defra.gov.uk' }
          },
          {
            input: 'defra.helpline@defra.gov.uk  ',
            output: { value: 'defra.helpline@defra.gov.uk' }
          },
          {
            input: '  defra.helpline@defra.gov.uk \n\n',
            output: { value: 'defra.helpline@defra.gov.uk' }
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
            input: 'defra.helpline',
            output: {
              value: 'defra.helpline',
              error: new Error(
                'Enter example email address field in the correct format'
              )
            }
          },
          {
            input: 'defra.helpline@defra',
            output: {
              value: 'defra.helpline@defra',
              error: new Error(
                'Enter example email address field in the correct format'
              )
            }
          },
          {
            input: 'defra.helpline@defra.gov.uk',
            output: { value: 'defra.helpline@defra.gov.uk' }
          }
        ]
      },
      {
        description: 'Custom validation',
        component: {
          title: 'Example email address field',
          name: 'myComponent',
          type: ComponentType.EmailAddressField,
          options: {
            customValidationMessage: 'This is a custom error'
          }
        } satisfies EmailAddressFieldComponent,
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
            input: '',
            output: { value: '' }
          }
        ]
      }
    ])('$description', ({ component: def, assertions }) => {
      let component: EmailAddressField

      beforeEach(() => {
        component = new EmailAddressField(def, formModel)
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
