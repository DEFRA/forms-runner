import { ComponentType, type SelectFieldComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { SelectField } from '~/src/server/plugins/engine/components/SelectField.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  listNumber,
  listNumberExamples,
  listString,
  listStringExamples
} from '~/test/fixtures/list.js'
import definition from '~/test/form/definitions/blank.js'
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
  const updated = structuredClone(definition)
  updated.lists = [options.list]

  let model: FormModel
  let collection: ComponentCollection
  let field: Field

  beforeEach(() => {
    model = new FormModel(updated, {
      basePath: 'test'
    })

    collection = new ComponentCollection([def], { model })
    field = collection.fields[0]
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
              label: def.title
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
          expect.objectContaining({
            allow: expect.arrayContaining([''])
          })
        )

        const result = collectionOptional.validate(getFormData(''))
        expect(result.errors).toBeUndefined()
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
          const result = collection.validate(getFormData(value))
          expect(result.errors).toBeUndefined()
        }
      )

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

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe(item.text)
        expect(answer2).toBe('')
      })

      it.each([...options.examples])('returns payload from state', (item) => {
        const state1 = getFormState(item.state)
        const state2 = getFormState(null)

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData(item.value))
        expect(payload2).toEqual(getFormData())
      })

      it.each([...options.examples])('returns value from state', (item) => {
        const state1 = getFormState(item.state)
        const state2 = getFormState(null)

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toEqual(item.value)
        expect(value2).toBeUndefined()
      })

      it.each([...options.examples])(
        'returns context for conditions and form submission',
        (item) => {
          const state1 = getFormState(item.state)
          const state2 = getFormState(null)

          const value1 = field.getContextValueFromState(state1)
          const value2 = field.getContextValueFromState(state2)

          expect(value1).toEqual(item.value)
          expect(value2).toBeNull()
        }
      )

      it.each([...options.examples])('returns state from payload', (item) => {
        const payload1 = getFormData(item.value)
        const payload2 = getFormData()

        const value1 = field.getStateFromValidForm(payload1)
        const value2 = field.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState(item.state))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const item = options.examples[0]
        const viewModel = field.getViewModel(getFormData(item.value))

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
          const viewModel = field.getViewModel(getFormData(item.value))

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
        expect(field).toHaveProperty('items', options.list.items)
      })

      it('returns select options matching type', () => {
        expect(field).toHaveProperty('values', expect.arrayContaining([]))
      })

      it('returns empty items when missing', () => {
        const model = new FormModel(definition, {
          basePath: 'test'
        })

        const { items } = new SelectField(def, { model })
        expect(items).toEqual([])
      })
    })
  })
})
