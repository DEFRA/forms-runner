import { AutocompleteField } from '~/src/server/plugins/engine/components/index.js'
import { type FormSubmissionErrors } from '~/src/server/plugins/engine/types.js'

describe('AutocompleteField', () => {
  const lists = [
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
    const componentDefinition = {
      subType: 'field',
      type: 'AutocompleteField',
      name: 'MyAutocomplete',
      title: 'Country?',
      options: {},
      list: 'Countries',
      schema: {}
    }

    const formModel = {
      getList: () => lists[0],
      makePage: () => jest.fn()
    }

    const component = new AutocompleteField(componentDefinition, formModel)

    it('is required by default', () => {
      expect(component.formSchema.describe().flags.presence).toBe('required')
    })

    it('validates correctly', () => {
      expect(component.formSchema.validate({}).error).toBeTruthy()
    })

    it('includes the first empty item in items list', () => {
      const { items } = component.getViewModel(
        { lang: 'en' },
        {} as FormSubmissionErrors
      )
      expect(items).toBeTruthy()
      expect(items?.[0]).toEqual({ value: '' })
    })
  })
})
