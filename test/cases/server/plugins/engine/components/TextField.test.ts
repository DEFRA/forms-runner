import {
  ComponentSubType,
  ComponentType,
  type ComponentDef
} from '@defra/forms-model'

import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import { messages } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

describe('TextField', () => {
  describe('Generated schema', () => {
    const componentDefinition: ComponentDef = {
      title: "What's your first name?",
      name: 'firstName',
      type: ComponentType.TextField,
      subType: ComponentSubType.Field,
      options: {
        autocomplete: 'given-name'
      },
      schema: {}
    }

    const formModel = {
      makePage: () => jest.fn()
    }

    const component = new TextField(componentDefinition, formModel)

    it('is required by default', () => {
      expect(component.formSchema.describe().flags.presence).toBe('required')
    })

    it('is not required when explicitly configured', () => {
      const component = TextComponent({ options: { required: false } })

      expect(component.formSchema.describe().flags.presence).not.toBe(
        'required'
      )
    })

    it('validates correctly', () => {
      expect(component.formSchema.validate({}).error).toBeTruthy()
    })

    it('should match pattern for regex', () => {
      let component = TextComponent({ schema: { regex: '[abc]*' } })

      expect(component.formSchema.validate('ab', { messages })).toEqual({
        value: 'ab'
      })

      component = TextComponent({ schema: { regex: null } })

      expect(component.formSchema.validate('*', { messages })).toEqual({
        value: '*'
      })

      component = TextComponent({ schema: { regex: undefined } })

      expect(component.formSchema.validate('/', { messages })).toEqual({
        value: '/'
      })

      component = TextComponent({ schema: { regex: '' } })

      expect(component.formSchema.validate('', { messages })).not.toEqual({
        value: ''
      })

      component = TextComponent({
        schema: {
          regex: '[A-Z]{1,2}[0-9]{1,2} ?[0-9][A-Z]{2}',
          min: 5,
          max: 10
        }
      })

      expect(component.formSchema.validate('AJ98 7AX', { messages })).toEqual({
        value: 'AJ98 7AX'
      })

      const invalidRegexResult = component.formSchema.validate('###six')
      expect(invalidRegexResult.error.details[0].type).toBe(
        'string.pattern.base'
      )

      const tooFewCharsResult = component.formSchema.validate('AJ98')
      expect(tooFewCharsResult.error.details[0].type).toBe('string.min')

      const tooManyCharsResult =
        component.formSchema.validate('AJ98 7AXAJ98 7AX')
      expect(tooManyCharsResult.error.details[0].type).toBe('string.max')
    })

    function TextComponent(properties) {
      return new TextField(
        {
          ...componentDefinition,
          ...properties
        },
        formModel
      )
    }
  })
})
