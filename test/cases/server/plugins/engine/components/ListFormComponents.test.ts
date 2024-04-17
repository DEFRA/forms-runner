import { ListFormComponent } from '../../../../../../src/server/plugins/engine/components/ListFormComponent.js'
import type { FormSubmissionState } from '../../../../../../src/server/plugins/engine/types.js'

describe('ListFormComponent', () => {
  const lists = [
    {
      title: 'Turnaround',
      name: 'Turnaround',
      type: 'string',
      items: [
        { text: '1 hour', value: '1' },
        { text: '2 hours', value: '2' }
      ]
    }
  ]

  const componentDefinition = {
    subType: 'field',
    type: 'ListFormComponent',
    name: 'MyListFormComponent',
    title: 'Turnaround?',
    options: {},
    list: 'Turnaround',
    schema: {}
  }

  const formModel = {
    getList: () => lists[0],
    makePage: () => jest.fn()
  }

  let component

  beforeEach(() => {
    component = new ListFormComponent(componentDefinition, formModel)
  })

  describe('getDisplayStringFromState', () => {
    it('it gets value correctly when state value is string', () => {
      const state: FormSubmissionState = {
        progress: [],
        MyListFormComponent: '2'
      }
      expect(component.getDisplayStringFromState(state)).toBe('2 hours')
      expect(component.getViewModel(state).value).toBe('2')
    })

    it('it gets value correctly when state value is number', () => {
      const state: FormSubmissionState = {
        progress: [],
        MyListFormComponent: 2
      }
      expect(component.getDisplayStringFromState(state)).toBe('2 hours')
      expect(component.getViewModel(state).value).toBe(2)
    })
  })

  describe('optional validation', () => {
    const optionalComponent = new ListFormComponent(
      {
        ...componentDefinition,
        options: {
          required: false
        }
      },
      formModel
    )

    it('schema validates correctly when the field is optional', () => {
      const schema = optionalComponent.formSchema

      expect(schema.validate('1').error).toBeUndefined()
      expect(schema.validate('2').error).toBeUndefined()
      expect(schema.validate('').error).toBeUndefined()
      expect(schema.validate(null).error).toBeUndefined()

      const errorMessage = '"turnaround?" must be one of [1, 2, ]'
      expect(schema.validate(10).error.message).toEqual(errorMessage)
      expect(schema.validate('ten').error.message).toEqual(errorMessage)
      expect(schema.validate(2).error.message).toEqual(errorMessage)
    })
  })
})
