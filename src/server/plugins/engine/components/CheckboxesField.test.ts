import {
  ComponentType,
  type CheckboxesFieldComponent,
  type FormDefinition
} from '@defra/forms-model'

import { CheckboxesField } from '~/src/server/plugins/engine/components/CheckboxesField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  listNumber,
  listNumberExamples,
  listString,
  listStringExamples
} from '~/test/fixtures/list.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe.each([
  {
    component: {
      title: 'String list',
      name: 'myComponent',
      type: ComponentType.CheckboxesField,
      list: 'listString',
      options: {}
    } satisfies CheckboxesFieldComponent,

    options: {
      list: listString,
      examples: listStringExamples,
      allow: ['1', '2', '3', '4'],
      deny: ['5', '6', '7', '8']
    }
  },
  {
    component: {
      title: 'Number list',
      name: 'myComponent',
      type: ComponentType.CheckboxesField,
      list: 'listNumber',
      options: {}
    } satisfies CheckboxesFieldComponent,

    options: {
      list: listNumber,
      examples: listNumberExamples,
      allow: [1, 2, 3, 4],
      deny: [5, 6, 7, 8]
    }
  }
])('CheckboxesField: $component.title', ({ component: def, options }) => {
  const definition = {
    pages: [],
    lists: [options.list],
    sections: [],
    conditions: []
  } satisfies FormDefinition

  let formModel: FormModel
  let component: CheckboxesField
  let label: string

  beforeEach(() => {
    formModel = new FormModel(definition, {
      basePath: 'test'
    })

    component = new CheckboxesField(def, formModel)
    label = def.title.toLowerCase()
  })

  describe('Defaults', () => {
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
                allow: options.allow,
                flags: {
                  label,
                  only: true
                },
                type: options.list.type
              }
            ]
          })
        )
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

      it.each([...options.allow])(
        'accepts valid checkbox single item',
        (value) => {
          const { formSchema } = component

          const result = formSchema.validate(value, opts)
          expect(result.error).toBeUndefined()
        }
      )

      it.each([...options.allow])(
        'accepts valid checkbox array item',
        (value) => {
          const { formSchema } = component

          const result = formSchema.validate([value], opts)
          expect(result.error).toBeUndefined()
        }
      )

      it.each([...options.deny])(
        'rejects invalid checkbox single item',
        (value) => {
          const { formSchema } = component

          const result = formSchema.validate(value, opts)

          expect(result.error).toEqual(
            expect.objectContaining({
              message: `Select ${label}`
            })
          )
        }
      )

      it.each([...options.deny])(
        'rejects invalid checkbox array item',
        (value) => {
          const { formSchema } = component

          const result = formSchema.validate([value], opts)

          expect(result.error).toEqual(
            expect.objectContaining({
              message: `Select ${label}`
            })
          )
        }
      )

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
      it.each([...options.examples])(
        'returns text from state (single)',
        (item) => {
          const state1 = getFormState([item.state])
          const state2 = getFormState(null)

          const text1 = component.getDisplayStringFromState(state1)
          const text2 = component.getDisplayStringFromState(state2)

          expect(text1).toBe(item.text)
          expect(text2).toBe('')
        }
      )

      it('returns text from state (multiple)', () => {
        const item1 = options.examples[0]
        const item2 = options.examples[2]

        const state = getFormState([item1.state, item2.state])
        const text = component.getDisplayStringFromState(state)

        expect(text).toBe(`${item1.text}, ${item2.text}`)
      })

      it.each([...options.examples])('returns payload from state', (item) => {
        const state1 = getFormState([item.state])
        const state2 = getFormState(null)

        const payload1 = component.getFormDataFromState(state1)
        const payload2 = component.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData([item.value]))
        expect(payload2).toEqual(getFormData())
      })

      it.each([...options.examples])('returns value from state', (item) => {
        const state1 = getFormState([item.state])
        const state2 = getFormState(null)

        const value1 = component.getFormValueFromState(state1)
        const value2 = component.getFormValueFromState(state2)

        expect(value1).toEqual([item.value])
        expect(value2).toBeUndefined()
      })

      it.each([...options.examples])('returns state from payload', (item) => {
        const payload1 = getFormData([item.value])
        const payload2 = getFormData()

        const value1 = component.getStateFromValidForm(payload1)
        const value2 = component.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState([item.state]))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const item = options.examples[0]

        const viewModel = component.getViewModel(getFormData([item.value]))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: def.name,
            id: def.name,
            value: [item.value]
          })
        )
      })

      it.each([...options.examples])(
        'sets Nunjucks component checkbox items',
        (item) => {
          const viewModel = component.getViewModel(getFormData([item.value]))

          expect(viewModel.items[0]).not.toMatchObject({
            value: '' // First item is never empty
          })

          expect(viewModel.items).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                text: item.text,
                value: item.value,
                checked: true
              })
            ])
          )
        }
      )
    })

    describe('Checkbox items', () => {
      it('returns checkbox items', () => {
        const { items } = component
        expect(items).toEqual(options.list.items)
      })

      it('returns checkbox items matching type', () => {
        const { values } = component
        expect(values).toEqual(expect.arrayContaining([]))
      })

      it('returns empty items when missing', () => {
        const definitionNoList = {
          pages: [],
          lists: [],
          sections: [],
          conditions: []
        } satisfies FormDefinition

        const formModel = new FormModel(definitionNoList, {
          basePath: 'test'
        })

        const { items } = new CheckboxesField(def, formModel)
        expect(items).toEqual([])
      })
    })
  })
})
