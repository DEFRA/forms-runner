import {
  ComponentType,
  type FormDefinition,
  type TelephoneNumberFieldComponent
} from '@defra/forms-model'

import { TelephoneNumberField } from '~/src/server/plugins/engine/components/TelephoneNumberField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('TelephoneNumberField', () => {
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
    let def: TelephoneNumberFieldComponent
    let component: TelephoneNumberField
    let label: string

    beforeEach(() => {
      def = {
        title: 'Example telephone number field',
        name: 'myComponent',
        type: ComponentType.TelephoneNumberField,
        options: {}
      } satisfies TelephoneNumberFieldComponent

      component = new TelephoneNumberField(def, formModel)
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
        const componentOptional = new TelephoneNumberField(
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
        const { formSchema } = component

        const result = formSchema.validate(value, opts)
        expect(result.error).toBeUndefined()
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
        const state1 = getFormState('+447900000000')
        const state2 = getFormState(null)

        const text1 = component.getDisplayStringFromState(state1)
        const text2 = component.getDisplayStringFromState(state2)

        expect(text1).toBe('+447900000000')
        expect(text2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState('+447900000000')
        const state2 = getFormState(null)

        const payload1 = component.getFormDataFromState(state1)
        const payload2 = component.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData('+447900000000'))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState('+447900000000')
        const state2 = getFormState(null)

        const value1 = component.getFormValueFromState(state1)
        const value2 = component.getFormValueFromState(state2)

        expect(value1).toBe('+447900000000')
        expect(value2).toBeUndefined()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData('+447900000000')
        const payload2 = getFormData()

        const value1 = component.getStateFromValidForm(payload1)
        const value2 = component.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState('+447900000000'))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = component.getViewModel(
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
        description: 'Custom validation',
        component: {
          title: 'Example telephone number field',
          name: 'myComponent',
          type: ComponentType.TelephoneNumberField,
          options: {
            customValidationMessage: 'This is a custom error'
          }
        } satisfies TelephoneNumberFieldComponent,
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
          title: 'Example telephone number field',
          name: 'myComponent',
          type: ComponentType.TelephoneNumberField,
          options: {
            required: false
          }
        } satisfies TelephoneNumberFieldComponent,
        assertions: [
          {
            input: '',
            output: { value: '' }
          }
        ]
      }
    ])('$description', ({ component: def, assertions }) => {
      let component: TelephoneNumberField

      beforeEach(() => {
        component = new TelephoneNumberField(def, formModel)
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
