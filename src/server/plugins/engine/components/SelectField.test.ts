import {
  ComponentType,
  type FormDefinition,
  type SelectFieldComponent
} from '@defra/forms-model'

import { SelectField } from '~/src/server/plugins/engine/components/SelectField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  listNumber,
  listNumberExamples,
  listString,
  listStringExamples
} from '~/test/fixtures/list.js'

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
  let component: SelectField
  let label: string

  beforeEach(() => {
    formModel = new FormModel(definition, {
      basePath: 'test'
    })

    component = new SelectField(def, formModel)
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
        const componentOptional = new SelectField(
          { ...def, options: { required: false } },
          formModel
        )

        const { formSchema } = componentOptional

        expect(formSchema.describe()).toEqual(
          expect.objectContaining({
            allow: expect.arrayContaining([''])
          })
        )

        const result = formSchema.validate('', opts)
        expect(result.error).toBeUndefined()
      })

      it('is configured with select options', () => {
        const { formSchema } = component

        expect(formSchema.describe()).toEqual(
          expect.objectContaining({
            allow: options.allow,
            type: options.list.type
          })
        )
      })

      it.each([...options.allow])(
        'accepts valid list item (value: %s)',
        (value) => {
          const { formSchema } = component

          const result = formSchema.validate(value, opts)
          expect(result.error).toBeUndefined()
        }
      )

      it('adds errors for empty value', () => {
        const { formSchema } = component

        const result = formSchema.validate('', opts)

        expect(result.error).toEqual(
          expect.objectContaining({
            message: `Select ${label}`
          })
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
      it.each([...options.examples])("returns '$text' from state", (item) => {
        const text = component.getDisplayStringFromState({
          [def.name]: item.state
        })

        expect(text).toBe(item.text)
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const item = options.examples[0]

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

      it.each([...options.examples])(
        'sets Nunjucks component select options',
        (item) => {
          const viewModel = component.getViewModel({
            [def.name]: item.value
          })

          expect(viewModel.items[0]).toMatchObject({
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
        const { items } = component
        expect(items).toEqual(options.list.items)
      })

      it('returns select options matching type', () => {
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

        const { items } = new SelectField(def, formModel)
        expect(items).toEqual([])
      })
    })
  })
})
