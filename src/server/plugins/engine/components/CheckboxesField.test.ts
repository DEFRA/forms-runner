import {
  ComponentType,
  type ComponentDef,
  type FormDefinition
} from '@defra/forms-model'

import { CheckboxesField } from '~/src/server/plugins/engine/components/CheckboxesField.js'

describe('CheckboxesField', () => {
  const lists: FormDefinition['lists'] = [
    {
      name: 'numberOfApplicants',
      title: 'Number of people',
      type: 'number',
      items: [
        {
          text: '1',
          value: 1,
          description: '',
          condition: ''
        },
        {
          text: '2',
          value: 2,
          description: '',
          condition: ''
        },
        {
          text: '3',
          value: 3,
          description: '',
          condition: ''
        },
        {
          text: '4',
          value: 4,
          description: '',
          condition: ''
        }
      ]
    }
  ]

  describe('Generated schema', () => {
    const componentDefinition: ComponentDef = {
      type: ComponentType.CheckboxesField,
      name: 'myCheckbox',
      title: 'Tada',
      options: {},
      list: 'numberOfApplicants',
      schema: {}
    }
    const formModel = {
      getList: () => lists[0],
      makePage: () => jest.fn()
    }
    const component = new CheckboxesField(componentDefinition, formModel)

    it('is required by default', () => {
      expect(component.formSchema.describe().flags).toEqual(
        expect.objectContaining({
          presence: 'required'
        })
      )
    })
    it('allows the items defined in the List object with the correct type', () => {
      expect(component.formSchema.describe().items).toEqual(
        expect.arrayContaining([
          {
            type: 'number',
            allow: [1, 2, 3, 4]
          }
        ])
      )
    })
    it('allows single answers', () => {
      expect(component.formSchema.describe().flags).toEqual(
        expect.objectContaining({
          single: true
        })
      )
    })
    it('is not required when explicitly configured', () => {
      const component = new CheckboxesField(
        {
          ...componentDefinition,
          options: { required: false }
        },
        formModel
      )
      expect(component.formSchema.describe().flags).not.toEqual(
        expect.objectContaining({
          presence: 'required'
        })
      )
    })
    it('validates correctly', () => {
      expect(component.formSchema.validate({}).error).toBeTruthy()
    })
  })
})
