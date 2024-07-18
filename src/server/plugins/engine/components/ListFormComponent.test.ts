import {
  ComponentType,
  type FormDefinition,
  type List,
  type ListComponentsDef
} from '@defra/forms-model'

import { ListFormComponent } from '~/src/server/plugins/engine/components/ListFormComponent.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

describe('ListFormComponent', () => {
  const listNumber = {
    title: 'Example number list',
    name: 'listNumber',
    type: 'number',
    items: [
      { text: '1 point', value: 1 },
      { text: '2 points', value: 2 },
      { text: '3 points', value: 3 },
      { text: '4 points', value: 4 }
    ]
  } satisfies List

  const listString = {
    title: 'Example string list',
    name: 'listString',
    type: 'string',
    items: [
      { text: '1 hour', value: '1' },
      { text: '2 hours', value: '2' },
      { text: '3 hours', value: '3' },
      { text: '4 hours', value: '4' }
    ]
  } satisfies List

  const definition = {
    pages: [],
    lists: [listNumber, listString],
    sections: [],
    conditions: []
  } satisfies FormDefinition

  describe.each([
    {
      component: {
        title: 'Example checkboxes',
        name: 'myCheckboxes',
        type: ComponentType.CheckboxesField,
        list: 'listNumber',
        options: {},
        schema: {}
      } satisfies ListComponentsDef,

      options: {
        type: 'number',
        allow: [1, 2, 3, 4],
        list: listNumber,
        items: [
          {
            text: '1 point',
            value: '1',
            state: 1
          }
        ]
      }
    },
    {
      component: {
        title: 'Example radios',
        name: 'myRadios',
        type: ComponentType.RadiosField,
        list: 'listString',
        options: {},
        schema: {}
      } satisfies ListComponentsDef,

      options: {
        type: 'string',
        allow: ['1', '2', '3', '4'],
        list: listString,
        items: [
          {
            text: '1 hour',
            value: '1',
            state: '1'
          }
        ]
      }
    },
    {
      component: {
        title: 'Example select',
        name: 'mySelect',
        type: ComponentType.SelectField,
        list: 'listString',
        options: {},
        schema: {}
      } satisfies ListComponentsDef,

      options: {
        type: 'string',
        allow: ['1', '2', '3', '4'],
        list: listString,
        items: [
          {
            text: '2 hours',
            value: '2',
            state: '2'
          }
        ]
      }
    },
    {
      component: {
        title: 'Example autocomplete',
        name: 'myAutocomplete',
        type: ComponentType.AutocompleteField,
        list: 'listString',
        options: {},
        schema: {}
      } satisfies ListComponentsDef,

      options: {
        type: 'string',
        allow: ['1', '2', '3', '4'],
        list: listString,
        items: [
          {
            text: '3 hours',
            value: '3',
            state: '3'
          }
        ]
      }
    }
  ])('Component: $component.type', ({ component: def, options }) => {
    let formModel: FormModel
    let component: ListFormComponent
    let label: string

    beforeEach(() => {
      formModel = new FormModel(definition, {
        basePath: 'test'
      })

      component = new ListFormComponent(def, formModel)
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
        const componentOptional = new ListFormComponent(
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

      it('is configured with list items', () => {
        const { formSchema } = component

        expect(formSchema.describe()).toEqual(
          expect.objectContaining({
            allow: options.allow,
            type: options.type
          })
        )
      })

      it.each([...options.allow])(
        'accepts valid list item value %s',
        (value) => {
          const { formSchema } = component

          const result = formSchema.validate(value, opts)
          expect(result.error).toBeUndefined()
        }
      )

      it('adds errors for empty value', () => {
        const { formSchema } = component

        const result = formSchema.validate(undefined, opts)

        expect(result.error).toEqual(
          expect.objectContaining({ message: `Select ${label}` })
        )
      })

      it('adds errors for invalid values', () => {
        const { formSchema } = component

        const result1 = formSchema.validate('invalid', opts)
        const result2 = formSchema.validate({ unknown: 'invalid' }, opts)

        expect(result1.error).toBeTruthy()
        expect(result2.error).toBeTruthy()
      })
    })

    describe('State', () => {
      it.each([...options.items])(
        "Returns text '$text' from state $state",
        (item) => {
          const text = component.getDisplayStringFromState({
            [def.name]: item.state
          })

          expect(text).toBe(item.text)
        }
      )
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const item = options.items[0]

        const viewModel = component.getViewModel({
          [def.name]: item.value
        })

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: def.name,
            id: def.name,
            value: item.value
          })
        )
      })

      it.each([...options.items])(
        'sets Nunjucks component list items',
        (item) => {
          const viewModel = component.getViewModel({
            [def.name]: item.value
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

    describe('List items', () => {
      it('returns list items', () => {
        const { items } = component
        expect(items).toEqual(options.list.items)
      })

      it('returns list items matching type', () => {
        const { values } = component
        expect(values).toEqual(expect.arrayContaining([]))
      })

      it('returns empty list when missing', () => {
        const definitionNoList = {
          pages: [],
          lists: [],
          sections: [],
          conditions: []
        } satisfies FormDefinition

        const formModel = new FormModel(definitionNoList, {
          basePath: 'test'
        })

        const { items } = new ListFormComponent(def, formModel)
        expect(items).toEqual([])
      })
    })
  })
})
