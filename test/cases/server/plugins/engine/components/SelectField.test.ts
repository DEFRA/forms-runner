import {
  ComponentType,
  type FormDefinition,
  type ListComponentsDef
} from '@defra/forms-model'

import { SelectField } from '~/src/server/plugins/engine/components/index.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'

describe('SelectField', () => {
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
    const componentDefinition: ListComponentsDef = {
      title: 'Where were you born?',
      name: 'countryOfBirth',
      type: ComponentType.SelectField,
      options: {},
      list: 'Countries',
      schema: {}
    }

    const formModel: FormModel = {
      getList: () => lists[0],
      makePage: () => jest.fn()
    }

    const component = new SelectField(componentDefinition, formModel)

    it('is required by default', () => {
      expect(component.formSchema.describe().flags.presence).toBe('required')
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
