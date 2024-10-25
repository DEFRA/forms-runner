import {
  ComponentType,
  type FormDefinition,
  type TextFieldComponent
} from '@defra/forms-model'

import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

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
      it('returns text from state value', () => {
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
