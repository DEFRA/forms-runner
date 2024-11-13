import {
  ComponentType,
  type FormDefinition,
  type YesNoFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type FormComponentFieldClass } from '~/src/server/plugins/engine/components/helpers.js'
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
  let collection: ComponentCollection
  let component: FormComponentFieldClass

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

    collection = new ComponentCollection([def], { model: formModel })
    component = collection.formItems[0]
  })

  describe('Schema', () => {
    it('uses component title as label', () => {
      const { formSchema } = collection
      const { keys } = formSchema.describe()

      expect(keys).toHaveProperty(
        'myComponent',
        expect.objectContaining({
          flags: expect.objectContaining({
            label: 'example yes/no'
          })
        })
      )
    })

    it('is required by default', () => {
      const { formSchema } = collection
      const { keys } = formSchema.describe()

      expect(keys).toHaveProperty(
        'myComponent',
        expect.objectContaining({
          flags: expect.objectContaining({
            presence: 'required'
          })
        })
      )
    })

    it('is optional when configured', () => {
      const collectionOptional = new ComponentCollection(
        [{ ...def, options: { required: false } }],
        { model: formModel }
      )

      const { formSchema } = collectionOptional
      const { keys } = formSchema.describe()

      expect(keys).toHaveProperty(
        'myComponent',
        expect.objectContaining({
          flags: expect.objectContaining({
            presence: 'optional'
          })
        })
      )

      const result = formSchema.validate(getFormData(), opts)
      expect(result.error).toBeUndefined()
    })

    it('is configured with radio items', () => {
      const { formSchema } = collection
      const { keys } = formSchema.describe()

      expect(keys).toHaveProperty(
        'myComponent',
        expect.objectContaining({
          allow: [true, false],
          type: 'boolean'
        })
      )
    })

    it('accepts valid values', () => {
      const { formSchema } = collection

      const result1 = formSchema.validate(getFormData('true'), opts)
      const result2 = formSchema.validate(getFormData('false'), opts)

      expect(result1.error).toBeUndefined()
      expect(result2.error).toBeUndefined()
    })

    it('adds errors for empty value', () => {
      const { formSchema } = collection

      const result = formSchema.validate(getFormData(), opts)

      expect(result.error).toEqual(
        expect.objectContaining({
          message: 'Select example yes/no'
        })
      )
    })

    it('adds errors for invalid values', () => {
      const { formSchema } = collection

      const result1 = formSchema.validate(getFormData('invalid'), opts)
      const result2 = formSchema.validate(getFormData(['true']), opts)
      const result3 = formSchema.validate(getFormData(['true', 'false']), opts)

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

      expect(viewModel.items?.[0]).not.toMatchObject({
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
