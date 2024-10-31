import {
  ComponentType,
  type FormDefinition,
  type YesNoFieldComponent
} from '@defra/forms-model'

import { YesNoField } from '~/src/server/plugins/engine/components/YesNoField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { listYesNoExamples } from '~/test/fixtures/list.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('YesNoField', () => {
  const definition = {
    pages: [],
    lists: [],
    sections: [],
    conditions: []
  } satisfies FormDefinition

  let def: YesNoFieldComponent
  let formModel: FormModel
  let component: YesNoField
  let label: string
  let allow: boolean[]

  beforeEach(() => {
    def = {
      title: 'Example yes/no',
      name: 'myComponent',
      type: ComponentType.YesNoField,
      options: {}
    } satisfies YesNoFieldComponent

    formModel = new FormModel(definition, {
      basePath: 'test'
    })

    component = new YesNoField(def, formModel)
    label = def.title.toLowerCase()
    allow = [true, false]
  })

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
      const componentOptional = new YesNoField(
        { ...def, options: { required: false } },
        formModel
      )

      const { formSchema } = componentOptional

      expect(formSchema.describe().flags).toEqual(
        expect.objectContaining({
          presence: 'optional'
        })
      )

      const result = formSchema.validate(undefined, opts)
      expect(result.error).toBeUndefined()
    })

    it('is configured with radio items', () => {
      const { formSchema } = component

      expect(formSchema.describe()).toEqual(
        expect.objectContaining({
          allow,
          type: 'boolean'
        })
      )
    })

    it('accepts valid values', () => {
      const { formSchema } = component

      const result1 = formSchema.validate('true', opts)
      const result2 = formSchema.validate('false', opts)

      expect(result1.error).toBeUndefined()
      expect(result2.error).toBeUndefined()
    })

    it('adds errors for empty value', () => {
      const { formSchema } = component

      const result = formSchema.validate(undefined, opts)

      expect(result.error).toEqual(
        expect.objectContaining({
          message: `Select ${label}`
        })
      )
    })

    it('adds errors for invalid values', () => {
      const { formSchema } = component

      const result1 = formSchema.validate('invalid', opts)
      const result2 = formSchema.validate(['true'], opts)
      const result3 = formSchema.validate(['true', 'false'], opts)

      expect(result1.error).toBeTruthy()
      expect(result2.error).toBeTruthy()
      expect(result3.error).toBeTruthy()
    })
  })

  describe('State', () => {
    it('returns text from state', () => {
      const state1 = getFormState(true)
      const state2 = getFormState(false)
      const state3 = getFormState(null)

      const text1 = component.getDisplayStringFromState(state1)
      const text2 = component.getDisplayStringFromState(state2)
      const text3 = component.getDisplayStringFromState(state3)

      expect(text1).toBe('Yes')
      expect(text2).toBe('No')
      expect(text3).toBe('')
    })

    it('returns payload from state', () => {
      const state1 = getFormState(true)
      const state2 = getFormState(false)
      const state3 = getFormState(null)

      const payload1 = component.getFormDataFromState(state1)
      const payload2 = component.getFormDataFromState(state2)
      const payload3 = component.getFormDataFromState(state3)

      expect(payload1).toEqual(getFormData(true))
      expect(payload2).toEqual(getFormData(false))
      expect(payload3).toEqual(getFormData())
    })

    it('returns value from state', () => {
      const state1 = getFormState(true)
      const state2 = getFormState(false)
      const state3 = getFormState(null)

      const value1 = component.getFormValueFromState(state1)
      const value2 = component.getFormValueFromState(state2)
      const value3 = component.getFormValueFromState(state3)

      expect(value1).toBe(true)
      expect(value2).toBe(false)
      expect(value3).toBeUndefined()
    })

    it('returns state from payload', () => {
      const payload1 = getFormData(true)
      const payload2 = getFormData(false)
      const payload3 = getFormData()

      const value1 = component.getStateFromValidForm(payload1)
      const value2 = component.getStateFromValidForm(payload2)
      const value3 = component.getStateFromValidForm(payload3)

      expect(value1).toEqual(getFormState(true))
      expect(value2).toEqual(getFormState(false))
      expect(value3).toEqual(getFormState(null))
    })
  })

  describe('View model', () => {
    const items = listYesNoExamples

    it('sets Nunjucks component defaults', () => {
      const item = items[0]

      const viewModel = component.getViewModel(getFormData(item.value))

      expect(viewModel).toEqual(
        expect.objectContaining({
          label: { text: def.title },
          name: 'myComponent',
          id: 'myComponent',
          value: item.value
        })
      )
    })

    it.each([...items])('sets Nunjucks component radio items', (item) => {
      const viewModel = component.getViewModel(getFormData(item.value))

      expect(viewModel.items[0]).not.toMatchObject({
        value: '' // First item is never empty
      })

      expect(viewModel.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: item.text,
            value: item.value,
            checked: true
          })
        ])
      )
    })
  })
})
