import {
  ComponentType,
  type FormDefinition,
  type SelectFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { SelectField } from '~/src/server/plugins/engine/components/SelectField.js'
import { type FormComponentFieldClass } from '~/src/server/plugins/engine/components/helpers.js'
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
      type: ComponentType.SelectField,
      list: 'listString',
      options: {}
    } satisfies SelectFieldComponent,

    options: {
      list: listString,
      examples: listStringExamples,
      allow: ['1', '2', '3', '4']
    }
  },
  {
    component: {
      title: 'Number list',
      name: 'myComponent',
      type: ComponentType.SelectField,
      list: 'listNumber',
      options: {}
    } satisfies SelectFieldComponent,

    options: {
      list: listNumber,
      examples: listNumberExamples,
      allow: [1, 2, 3, 4]
    }
  }
])('SelectField: $component.title', ({ component: def, options }) => {
  const definition = {
    pages: [],
    lists: [options.list],
    sections: [],
    conditions: []
  } satisfies FormDefinition

  let formModel: FormModel
  let collection: ComponentCollection
  let component: FormComponentFieldClass

  beforeEach(() => {
    formModel = new FormModel(definition, {
      basePath: 'test'
    })

    collection = new ComponentCollection([def], { model: formModel })
    component = collection.formItems[0]
  })

  describe('Defaults', () => {
    describe('Schema', () => {
      it('uses component title as label', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              label: def.title.toLowerCase()
            })
          })
        )
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
          { model: formModel }
        )

        const { formSchema } = collectionOptional
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            allow: expect.arrayContaining([''])
          })
        )

        const result = formSchema.validate(getFormData(''), opts)
        expect(result.error).toBeUndefined()
      })

      it('is configured with select options', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            allow: options.allow,
            type: options.list.type
          })
        )
      })

      it.each([...options.allow])(
        'accepts valid list item (value: %s)',
        (value) => {
          const { formSchema } = collection

          const result = formSchema.validate(getFormData(value), opts)
          expect(result.error).toBeUndefined()
        }
      )

      it('adds errors for empty value', () => {
        const { formSchema } = collection

        const result = formSchema.validate(getFormData(), opts)

        expect(result.error).toEqual(
          expect.objectContaining({
            message: `Select ${def.title.toLowerCase()}`
          })
        )
      })

      it('adds errors for invalid values', () => {
        const { formSchema } = collection

        const result1 = formSchema.validate(getFormData('invalid'), opts)
        const result2 = formSchema.validate(
          // @ts-expect-error - Allow invalid param for test
          getFormData({ unknown: 'invalid' }),
          opts
        )

        expect(result1.error).toBeTruthy()
        expect(result2.error).toBeTruthy()
      })
    })

    describe('State', () => {
      it.each([...options.examples])('returns text from state', (item) => {
        const state1 = getFormState(item.state)
        const state2 = getFormState(null)

        const text1 = component.getDisplayStringFromState(state1)
        const text2 = component.getDisplayStringFromState(state2)

        expect(text1).toBe(item.text)
        expect(text2).toBe('')
      })

      it.each([...options.examples])('returns payload from state', (item) => {
        const state1 = getFormState(item.state)
        const state2 = getFormState(null)

        const payload1 = component.getFormDataFromState(state1)
        const payload2 = component.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData(item.value))
        expect(payload2).toEqual(getFormData())
      })

      it.each([...options.examples])('returns value from state', (item) => {
        const state1 = getFormState(item.state)
        const state2 = getFormState(null)

        const value1 = component.getFormValueFromState(state1)
        const value2 = component.getFormValueFromState(state2)

        expect(value1).toEqual(item.value)
        expect(value2).toBeUndefined()
      })

      it.each([...options.examples])('returns state from payload', (item) => {
        const payload1 = getFormData(item.value)
        const payload2 = getFormData()

        const value1 = component.getStateFromValidForm(payload1)
        const value2 = component.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState(item.state))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const item = options.examples[0]
        const viewModel = component.getViewModel(getFormData(item.value))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: item.value
          })
        )
      })

      it.each([...options.examples])(
        'sets Nunjucks component select options',
        (item) => {
          const viewModel = component.getViewModel(getFormData(item.value))

          expect(viewModel.items?.[0]).toMatchObject({
            value: '' // First item is always empty
          })

          expect(viewModel.items).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                text: item.text,
                value: item.value,
                selected: true
              })
            ])
          )
        }
      )
    })

    describe('Select options', () => {
      it('returns select options', () => {
        expect(component).toHaveProperty('items', options.list.items)
      })

      it('returns select options matching type', () => {
        expect(component).toHaveProperty('values', expect.arrayContaining([]))
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

        const { items } = new SelectField(def, formModel)
        expect(items).toEqual([])
      })
    })
  })
})
