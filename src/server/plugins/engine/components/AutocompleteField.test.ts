import {
  ComponentType,
  type ComponentDef,
  type FormDefinition
} from '@defra/forms-model'

import { AutocompleteField } from '~/src/server/plugins/engine/components/AutocompleteField.js'

describe('AutocompleteField', () => {
  const lists: FormDefinition['lists'] = [
    {
      name: 'Countries',
      title: 'Countries',
      type: 'string',
      items: [
        {
          text: 'United Kingdom',
          value: 'United Kingdom',
          description: '',
          condition: ''
        },
        {
          text: 'Thailand',
          value: 'Thailand',
          description: '',
          condition: ''
        },
        {
          text: 'Spain',
          value: 'Spain',
          description: '',
          condition: ''
        },
        {
          text: 'France',
          value: 'France',
          description: '',
          condition: ''
        },
        {
          text: 'Thailand',
          value: 'Thailand',
          description: '',
          condition: ''
        }
      ]
    }
  ]

  describe('Generated schema', () => {
    const componentDefinition: ComponentDef = {
      title: 'Country?',
      name: 'MyAutocomplete',
      type: ComponentType.AutocompleteField,
      options: {},
      list: 'Countries'
    }

    const formModel = {
      getList: () => lists[0],
      makePage: () => jest.fn()
    }

    const component = new AutocompleteField(componentDefinition, formModel)

    it('is required by default', () => {
      expect(component.formSchema.describe().flags).toEqual(
        expect.objectContaining({
          presence: 'required'
        })
      )
    })

    it('validates correctly', () => {
      expect(component.formSchema.validate({}).error).toBeTruthy()
    })

    it('includes the first empty item in items list', () => {
      const { items } = component.getViewModel({})
      expect(items).toBeTruthy()
      expect(items?.[0]).toEqual({ value: '' })
    })
  })
})
