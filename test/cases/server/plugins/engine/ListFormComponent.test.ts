import { ListFormComponent } from '../../../../../src/server/plugins/engine/components/ListFormComponent'

describe('ListFormComponent', () => {
  const lists = [
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
    const componentDefinition = {
      subType: 'field',
      type: 'SelectField',
      name: 'mySelectField',
      title: 'Tada',
      options: {},
      list: 'numberOfApplicants',
      schema: {}
    }
    const formModel = {
      getList: () => lists[0],
      makePage: () => jest.fn()
    }
    const component = new ListFormComponent(componentDefinition, formModel)

    it('is required by default', () => {
      expect(component.formSchema.describe().flags.presence).toBe('required')
    })

    it('allows the items defined in the List object with the correct type', () => {
      expect(component.formSchema.describe()).toEqual(
        expect.objectContaining({
          type: 'number',
          allow: [1, 2, 3, 4]
        })
      )
    })

    it('is not required when explicitly configured', () => {
      const component = new ListFormComponent(
        {
          ...componentDefinition,
          options: { required: false }
        },
        formModel
      )
      expect(component.formSchema.describe().flags.presence).not.toBe(
        'required'
      )
    })

    it('validates correctly', () => {
      const badPayload = { notMyName: 5 }
      expect(component.formSchema.validate(badPayload).error).toBeTruthy()
    })

    it('is labelled correctly', () => {
      expect(component.formSchema.describe().flags.label).toBe('tada')
    })
  })
})
