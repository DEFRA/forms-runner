import {
  ComponentType,
  type EmailAddressFieldComponent,
  type FormDefinition
} from '@defra/forms-model'

import { EmailAddressField } from '~/src/server/plugins/engine/components/EmailAddressField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

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
      it('Returns text from state value', () => {
        const text = component.getDisplayStringFromState({
          [def.name]: 'Text field'
        })

        expect(text).toBe('Text field')
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = component.getViewModel({
          [def.name]: 'Text field'
        })

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: 'Text field',
            type: 'email',
            autocomplete: 'email'
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
      }
    ])('$description', ({ component: def, assertions }) => {
      let component: EmailAddressField
      let label: string

      beforeEach(() => {
        component = new EmailAddressField(def, formModel)
        label = def.title.toLowerCase()
      })

      it('validates empty value', () => {
        const { formSchema } = component

        const input = ''
        const output = {
          value: '',
          error: new Error(`Enter ${label}`)
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
