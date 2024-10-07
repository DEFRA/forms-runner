import {
  ComponentType,
  type CheckboxesFieldComponent,
  type FormDefinition,
  type List
} from '@defra/forms-model'

import { CheckboxesField } from '~/src/server/plugins/engine/components/CheckboxesField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

describe('CheckboxesField', () => {
  const examples = [
    {
      text: '1 point',
      value: 1,
      state: 1
    },
    {
      text: '2 points',
      value: 2,
      state: 2
    },
    {
      text: '3 points',
      value: 3,
      state: 3
    },
    {
      text: '4 points',
      value: 4,
      state: 4
    }
  ]

  const list = {
    title: 'Example number list',
    name: 'listNumber',
    type: 'number',
    items: examples.map((example) => ({
      text: example.text,
      value: example.state
    }))
  } satisfies List

  const definition = {
    pages: [],
    lists: [list],
    sections: [],
    conditions: []
  } satisfies FormDefinition

  let def: CheckboxesFieldComponent
  let formModel: FormModel
  let component: CheckboxesField
  let label: string
  let allow: number[]

  beforeEach(() => {
    def = {
      title: 'Example checkboxes',
      name: 'myComponent',
      type: ComponentType.CheckboxesField,
      list: 'listNumber',
      options: {}
    } satisfies CheckboxesFieldComponent

    formModel = new FormModel(definition, {
      basePath: 'test'
    })

    component = new CheckboxesField(def, formModel)
    label = def.title.toLowerCase()
    allow = [1, 2, 3, 4]
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
      const componentOptional = new CheckboxesField(
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

    it('is configured for single values', () => {
      const { formSchema } = component

      expect(formSchema.describe().flags).toEqual(
        expect.objectContaining({
          single: true
        })
      )
    })

    it('is configured with checkbox items', () => {
      const { formSchema } = component

      expect(formSchema.describe()).toEqual(
        expect.objectContaining({
          items: [
            {
              allow,
              flags: {
                label,
                only: true
              },
              type: 'number'
            }
          ]
        })
      )
    })

    it('accepts valid checkbox single value', () => {
      const { formSchema } = component

      const result1 = formSchema.validate(1, opts)
      const result2 = formSchema.validate('1', opts)

      expect(result1.error).toBeUndefined()
      expect(result2.error).toBeUndefined()
    })

    it('accepts valid checkbox multiple values', () => {
      const { formSchema } = component

      const result1 = formSchema.validate([1, 3], opts)
      const result2 = formSchema.validate(['1', '3'], opts)

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

    it('adds errors for single unknown value', () => {
      const { formSchema } = component

      const result = formSchema.validate(8, opts)

      expect(result.error).toEqual(
        expect.objectContaining({
          message: `Select ${label}`
        })
      )
    })

    it('adds errors for multiple unknown values', () => {
      const { formSchema } = component

      const result = formSchema.validate([8, 9], opts)

      expect(result.error).toEqual(
        expect.objectContaining({
          message: `Select ${label}`
        })
      )
    })

    it('adds errors for invalid values', () => {
      const { formSchema } = component

      const result1 = formSchema.validate('invalid', opts)
      const result2 = formSchema.validate(['invalid1', 'invalid2'], opts)
      const result3 = formSchema.validate({ unknown: 'invalid' }, opts)

      expect(result1.error).toBeTruthy()
      expect(result2.error).toBeTruthy()
      expect(result3.error).toBeTruthy()
    })
  })

  describe('State', () => {
    it.each([...examples])(
      "Returns text '$text' from state [$state]",
      (item) => {
        const text = component.getDisplayStringFromState({
          [def.name]: [item.state]
        })

        expect(text).toBe(item.text)
      }
    )

    it('Returns text from multiple state values', () => {
      const item1 = examples[0]
      const item2 = examples[2]

      const text = component.getDisplayStringFromState({
        [def.name]: [item1.state, item2.state]
      })

      expect(text).toBe('1 point, 3 points')
    })
  })

  describe('View model', () => {
    it('sets Nunjucks component defaults', () => {
      const item = examples[0]

      const viewModel = component.getViewModel({
        [def.name]: [item.value]
      })

      expect(viewModel).toEqual(
        expect.objectContaining({
          label: { text: def.title },
          name: 'myComponent',
          id: 'myComponent',
          value: [item.value]
        })
      )
    })

    it('handles Nunjucks component value when schema validation is skipped', () => {
      const value = `${examples[0].value}`

      // Value as single string (not an array)
      const viewModel1 = component.getViewModel({
        [def.name]: value
      })

      // Value as undefined (not an array)
      const viewModel2 = component.getViewModel({
        [def.name]: undefined
      })

      // Both values should be returned as arrays
      expect(viewModel1.value).toEqual([value])
      expect(viewModel2.value).toEqual([])
    })

    it.each([...examples])('sets Nunjucks component checkbox items', (item) => {
      const viewModel = component.getViewModel({
        [def.name]: [item.value]
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
