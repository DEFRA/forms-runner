import {
  ComponentType,
  type FormDefinition,
  type YesNoFieldComponent
} from '@defra/forms-model'

import { YesNoField } from '~/src/server/plugins/engine/components/YesNoField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

describe('YesNoField', () => {
  const definition = {
    pages: [],
    lists: [],
    sections: [],
    conditions: []
  } satisfies FormDefinition

  let def: YesNoFieldComponent
  let formModel: FormModel
  let component: YesNoField
  let label: string
  let allow: boolean[]

  beforeEach(() => {
    def = {
      title: 'Example yes/no',
      name: 'myComponent',
      type: ComponentType.YesNoField,
      options: {}
    } satisfies YesNoFieldComponent

    formModel = new FormModel(definition, {
      basePath: 'test'
    })

    component = new YesNoField(def, formModel)
    label = def.title.toLowerCase()
    allow = [true, false]
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
      const componentOptional = new YesNoField(
        { ...def, options: { required: false } },
        formModel
      )

      const { formSchema } = componentOptional

      expect(formSchema.describe().flags).toEqual(
        expect.objectContaining({
          presence: 'optional'
        })
      )

      const result = formSchema.validate(undefined, opts)
      expect(result.error).toBeUndefined()
    })

    it('is configured with radio items', () => {
      const { formSchema } = component

      expect(formSchema.describe()).toEqual(
        expect.objectContaining({
          allow,
          type: 'boolean'
        })
      )
    })

    it('accepts valid values', () => {
      const { formSchema } = component

      const result1 = formSchema.validate('true', opts)
      const result2 = formSchema.validate('false', opts)

      expect(result1.error).toBeUndefined()
      expect(result2.error).toBeUndefined()
    })

    it('adds errors for empty value', () => {
      const { formSchema } = component

      const result = formSchema.validate(undefined, opts)

      expect(result.error).toEqual(
        expect.objectContaining({
          message: `Select ${label}`
        })
      )
    })

    it('adds errors for invalid values', () => {
      const { formSchema } = component

      const result1 = formSchema.validate('invalid', opts)
      const result2 = formSchema.validate(['true'], opts)
      const result3 = formSchema.validate(['true', 'false'], opts)

      expect(result1.error).toBeTruthy()
      expect(result2.error).toBeTruthy()
      expect(result3.error).toBeTruthy()
    })
  })

  describe('State', () => {
    it('Returns text from state value', () => {
      const textYes = component.getDisplayStringFromState({
        [def.name]: true
      })

      const textNo = component.getDisplayStringFromState({
        [def.name]: false
      })

      expect(textYes).toBe('Yes')
      expect(textNo).toBe('No')
    })
  })

  describe('View model', () => {
    const items = [
      {
        text: 'Yes',
        value: true,
        state: true
      },
      {
        text: 'No',
        value: false,
        state: false
      }
    ]

    it('sets Nunjucks component defaults', () => {
      const item = items[0]

      const viewModel = component.getViewModel({
        [def.name]: item.value
      })

      expect(viewModel).toEqual(
        expect.objectContaining({
          label: { text: def.title },
          name: 'myComponent',
          id: 'myComponent',
          value: item.value
        })
      )
    })

    it.each([...items])('sets Nunjucks component radio items', (item) => {
      const viewModel = component.getViewModel({
        [def.name]: item.value
      })

      expect(viewModel.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: item.text,
            value: `${item.value}`,
            checked: true
          })
        ])
      )
    })
  })
})
