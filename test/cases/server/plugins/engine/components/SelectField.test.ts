import { expect } from '@hapi/code'
import * as Lab from '@hapi/lab'
import sinon from 'sinon'
import { FormModel } from '../../../../../../src/server/plugins/engine/models'
import { ListComponentsDef } from '@defra/forms-model'
import { FormSubmissionErrors } from '../../../../../../src/server/plugins/engine/types'
import { SelectField } from '../../../../../../src/server/plugins/engine/components'

export const lab = Lab.script()
const { suite, describe, it } = lab

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

suite('SelectField', () => {
  describe('Generated schema', () => {
    const componentDefinition: ListComponentsDef = {
      subType: 'field',
      type: 'SelectField',
      name: 'countryOfBirth',
      title: 'Where were you born?',
      options: {},
      list: 'Countries',
      schema: {}
    }

    const formModel: FormModel = {
      getList: () => lists[0],
      makePage: () => sinon.stub()
    }

    const component = new SelectField(componentDefinition, formModel)

    it('is required by default', () => {
      expect(component.formSchema.describe().flags.presence).to.equal(
        'required'
      )
    })

    it('validates correctly', () => {
      expect(component.formSchema.validate({}).error).to.exist()
    })

    it('includes the first empty item in items list', () => {
      const { items } = component.getViewModel(
        { lang: 'en' },
        {} as FormSubmissionErrors
      )
      expect(items).to.exist()
      expect(items![0]).to.equal({ value: '' })
    })
  })
})
