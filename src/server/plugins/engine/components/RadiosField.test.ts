import {
  ComponentType,
  type FormDefinition,
  type RadiosFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { RadiosField } from '~/src/server/plugins/engine/components/RadiosField.js'
import { type FormComponentFieldClass } from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
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
      type: ComponentType.RadiosField,
      list: 'listString',
      options: {}
    } satisfies RadiosFieldComponent,

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
      type: ComponentType.RadiosField,
      list: 'listNumber',
      options: {}
    } satisfies RadiosFieldComponent,

    options: {
      list: listNumber,
      examples: listNumberExamples,
      allow: [1, 2, 3, 4]
    }
  }
])('RadiosField: $component.title', ({ component: def, options }) => {
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

      it('uses component name as keys', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(component.keys).toEqual(['myComponent'])
        expect(component.children).toBeUndefined()

        for (const key of component.keys) {
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
          { model: formModel }
        )

        const { formSchema } = collectionOptional
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              presence: 'optional'
            })
          })
        )

        const result = collectionOptional.validate(getFormData())
        expect(result.errors).toBeUndefined()
      })

      it('is configured with radio items', () => {
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

      it.each([...options.allow])('accepts valid radio item', (value) => {
        const result = collection.validate(getFormData(value))
        expect(result.errors).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(getFormData())

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: `Select ${def.title.toLowerCase()}`
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
        'sets Nunjucks component radio items',
        (item) => {
          const viewModel = component.getViewModel(getFormData(item.value))

          expect(viewModel.items?.[0]).not.toMatchObject({
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

    describe('Radio items', () => {
      it('returns radio items', () => {
        expect(component).toHaveProperty('items', options.list.items)
      })

      it('returns radio items matching type', () => {
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

        const { items } = new RadiosField(def, formModel)
        expect(items).toEqual([])
      })
    })
  })
})
