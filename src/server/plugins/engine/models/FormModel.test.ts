import {
  SchemaVersion,
  formDefinitionV2Schema,
  type FormDefinition
} from '@defra/forms-model'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { type FormContextRequest } from '~/src/server/plugins/engine/types.js'
import { V2 as definitionV2 } from '~/test/form/definitions/conditions-basic.js'
import definition from '~/test/form/definitions/conditions-escaping.js'
import conditionsListDefinition from '~/test/form/definitions/conditions-list.js'
import fieldsRequiredDefinition from '~/test/form/definitions/fields-required.js'

describe('FormModel', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('Constructor', () => {
    it("doesn't throw when conditions are passed with apostrophes", () => {
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

    it('Builds a map of lists from the definition and only indexes those with IDs', () => {
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

      expect(Array.from(model.listDefIdMap.keys())).toContain(
        'c5eba145-b04d-4d41-a50c-e5e2f9b6357f'
      )
      expect(model.listDefIdMap.size).toBe(2) // 1 + the yes/no list. list 'bar' isn't present as there's no ID
    })

    it('Builds a map of components from the definition and only indexes those with IDs', () => {
      jest.mock('@defra/forms-model')

      formDefinitionV2Schema.validate = jest
        .fn()
        .mockReturnValue({ value: definitionV2 })

      const model = new FormModel(definitionV2, { basePath: 'test' })

      expect(Array.from(model.componentDefIdMap.keys())).toContain(
        '717eb213-4e4b-4a2d-9cfd-2780f5e1e3e5'
      )
      expect(model.listDefIdMap.size).toBe(1)
    })

    it('throws an error if schema validation fails', () => {
      jest.mock('@defra/forms-model')

      formDefinitionV2Schema.validate = jest.fn().mockImplementation(() => {
        throw new Error('Validation error')
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
})
