import {
  SchemaVersion,
  formDefinitionV2Schema,
  type FormDefinition
} from '@defra/forms-model'

import { todayAsDateOnly } from '~/src/server/plugins/engine/date-helper.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type FormContextRequest } from '~/src/server/plugins/engine/types.js'
import { V2 as definitionV2 } from '~/test/form/definitions/conditions-basic.js'
import definition from '~/test/form/definitions/conditions-escaping.js'
import conditionsListDefinition from '~/test/form/definitions/conditions-list.js'
import relativeDatesDefinition from '~/test/form/definitions/conditions-relative-dates-v2.js'
import fieldsRequiredDefinition from '~/test/form/definitions/fields-required.js'

jest.mock('~/src/server/plugins/engine/date-helper.ts')

describe('FormModel', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('Constructor', () => {
    it('loads a valid form definition', () => {
      expect(
        () => new FormModel(definition, { basePath: 'test' })
      ).not.toThrow()
    })

    it('Sets the page title from first form component when empty (V2 only)', () => {
      const noTitlesDefinition = {
        ...definitionV2,
        pages: definitionV2.pages.map((page) => ({ ...page, title: '' }))
      }

      const model = new FormModel(noTitlesDefinition, { basePath: 'test' })

      expect(model.def.pages.at(0)?.title).toBe(
        'Have you previously been married?'
      )
      expect(model.def.pages.at(1)?.title).toBe('Date of marriage')
    })

    it('Gets a list by ID', () => {
      jest.mock('@defra/forms-model')

      const definitionWithLists: FormDefinition = {
        ...definitionV2,
        lists: [
          {
            id: 'c5eba145-b04d-4d41-a50c-e5e2f9b6357f',
            type: 'string',
            title: 'foo',
            name: 'foo',
            items: [
              { text: 'a', value: 'a' },
              { text: 'b', value: 'b' }
            ]
          },
          {
            type: 'string',
            title: 'bar',
            name: 'bar',
            items: [
              {
                id: 'a85a42a8-3e08-4c2a-b263-a0dc0b8c49f6',
                text: 'a',
                value: 'a'
              },
              {
                id: 'c31664ac-887b-434b-b9f4-e5bc30d24439',
                text: 'b',
                value: 'b'
              }
            ]
          }
        ]
      }

      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: definitionWithLists })

      const model = new FormModel(definitionWithLists, { basePath: 'test' })

      expect(
        model.getListById('c5eba145-b04d-4d41-a50c-e5e2f9b6357f')
      ).toBeDefined()
      expect(model.listDefIdMap.size).toBe(2) // 1 + the yes/no list. list 'bar' isn't present as there's no ID
    })

    it('Gets a component by ID', () => {
      jest.mock('@defra/forms-model')

      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: definitionV2 })

      const model = new FormModel(definitionV2, { basePath: 'test' })

      expect(
        model.getComponentById('717eb213-4e4b-4a2d-9cfd-2780f5e1e3e5')
      ).toBeDefined()
      expect(model.listDefIdMap.size).toBe(1)
    })

    it('gets a condition by its ID', () => {
      jest.mock('@defra/forms-model')
      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: definitionV2 })
      const model = new FormModel(definitionV2, { basePath: 'test' })

      expect(
        model.getConditionById('6c9e2f4a-1d7b-5e8c-3f6a-9e2d5b7c4f1a')
      ).toBeDefined()
    })

    it('throws an error if schema validation fails', () => {
      jest.mock('@defra/forms-model')

      formDefinitionV2Schema.validate = jest.fn().mockReturnValueOnce({
        error: 'Validation error'
      })

      expect(() => new FormModel(definitionV2, { basePath: 'test' })).toThrow(
        'Validation error'
      )
    })

    it('assigns v1 to the schema if not defined', () => {
      const definitionWithoutSchema: FormDefinition = {
        ...definition,
        schema: undefined
      }

      // Mock validation to just return the definition
      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: definitionWithoutSchema })

      const model = new FormModel(definitionWithoutSchema, { basePath: 'test' })

      expect(model.schemaVersion).toBe(SchemaVersion.V1)
    })
  })

  describe('getFormContext', () => {
    it('clears a previous checkbox field value when the field is omitted from the payload', () => {
      const formModel = new FormModel(fieldsRequiredDefinition, {
        basePath: '/components'
      })

      const state = { checkboxesSingle: ['Arabian', 'Shetland'] }
      const pageUrl = new URL('http://example.com/components/fields-required')

      const request: FormContextRequest = {
        method: 'post',
        payload: { crumb: 'dummyCrumb', action: 'validate' },
        query: {},
        path: pageUrl.pathname,
        params: { path: 'components', slug: 'fields-required' },
        url: pageUrl,
        app: { model: formModel }
      }

      const context = formModel.getFormContext(request, state)

      expect(context.payload.checkboxesSingle).toEqual([])
      expect(context.errors).toContainEqual(
        expect.objectContaining({ name: 'checkboxesSingle' })
      )
    })

    it('redirects to the page if the list field (radio) is invalidated due to list item conditions', () => {
      const formModel = new FormModel(conditionsListDefinition, {
        basePath: '/conditional-list-items'
      })

      const state = {
        gXsqLq: true,
        QwcNsc: 'meat',
        zeQDES: ['peppers', 'cheese', 'ham']
      }
      const pageUrl = new URL(
        'http://example.com/conditional-list-items/summary'
      )

      const request: FormContextRequest = {
        method: 'get',
        query: {},
        path: pageUrl.pathname,
        params: { path: 'summary', slug: 'conditional-list-items' },
        url: pageUrl,
        app: { model: formModel }
      }

      const context = formModel.getFormContext(request, state)

      expect(context.errors).toHaveLength(1)
      expect(context.errors?.at(0)?.text).toBe(
        'Options are different because you changed a previous answer'
      )
      expect(context.relevantPages).toHaveLength(2)
      expect(context.paths).toHaveLength(2)
      expect(context.relevantState).toEqual({ gXsqLq: true, QwcNsc: 'meat' })
    })

    it('redirects to the page if the list field (check) is invalidated due to list item conditions', () => {
      const formModel = new FormModel(conditionsListDefinition, {
        basePath: '/conditional-list-items'
      })

      const state = {
        gXsqLq: true,
        QwcNsc: 'vegan',
        zeQDES: ['peppers', 'cheese', 'ham']
      }
      const pageUrl = new URL(
        'http://example.com/conditional-list-items/summary'
      )

      const request: FormContextRequest = {
        method: 'get',
        query: {},
        path: pageUrl.pathname,
        params: { path: 'summary', slug: 'conditional-list-items' },
        url: pageUrl,
        app: { model: formModel }
      }

      const context = formModel.getFormContext(request, state)

      expect(context.errors).toHaveLength(1)
      expect(context.errors?.at(0)?.text).toBe(
        'Options are different because you changed a previous answer'
      )
      expect(context.relevantPages).toHaveLength(3)
      expect(context.paths).toHaveLength(3)
      expect(context.relevantState).toEqual({
        gXsqLq: true,
        QwcNsc: 'vegan',
        zeQDES: ['peppers', 'cheese', 'ham']
      })
    })
  })

  describe('makeCondition', () => {
    test('relative date condition', () => {
      jest.mock('@defra/forms-model')
      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: relativeDatesDefinition })
      const model = new FormModel(relativeDatesDefinition, { basePath: 'test' })

      const allConditionsKeys = Object.keys(model.conditions)
      expect(allConditionsKeys).toHaveLength(8)

      // Only test releative date conditions
      const relativeConditionsKeys = allConditionsKeys.slice(4)
      expect(relativeConditionsKeys).toHaveLength(4)

      const formState = {
        ybMHIv: '2023-06-18'
      }

      const expectedResultsDayBefore = [true, false, false, true]

      const expectedResultsDayOf = [true, true, false, false]

      const expectedResultsDayAfter = [false, true, true, false]

      // Only relative date conditions
      for (let i = 0; i < relativeConditionsKeys.length; i++) {
        const condition = model.conditions[relativeConditionsKeys[i]]
        jest.mocked(todayAsDateOnly).mockReturnValue(new Date(2025, 5, 19))
        const conditionExec = model.makeCondition(
          // @ts-expect-error - type doesnt need to match for this test
          condition
        )
        formState.ybMHIv = '2023-06-18'
        expect(conditionExec.fn(formState)).toBe(expectedResultsDayBefore[i])

        formState.ybMHIv = '2023-06-19'
        expect(conditionExec.fn(formState)).toBe(expectedResultsDayOf[i])

        formState.ybMHIv = '2023-06-20'
        expect(conditionExec.fn(formState)).toBe(expectedResultsDayAfter[i])
      }
    })
  })
})
