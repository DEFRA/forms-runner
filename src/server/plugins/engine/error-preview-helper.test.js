import { ComponentType } from '@defra/forms-model'

import {
  createErrorPreviewModel,
  determineLimit,
  expandTemplate,
  getOptionsProperty,
  getSchemaProperty,
  isTypeForMinMax
} from '~/src/server/plugins/engine/error-preview-helper.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { componentId, definitionWithComponentId } from '~/test/fixtures/form.js'

describe('Error preview helper', () => {
  describe('expandTemplate', () => {
    it('should return expanded template - simple single token', () => {
      const template = messageTemplate.required
      const res = expandTemplate(template, { label: 'Your name' })
      expect(res).toBe('Enter your name')
    })

    it('should return expanded template - multiple tokens', () => {
      const template = messageTemplate.min
      const res = expandTemplate(template, { label: 'Your age', limit: 7 })
      expect(res).toBe('Your age must be 7 characters or more')
    })
  })

  describe('getSchemaProperty', () => {
    it('should return schema property', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {
          min: 5
        },
        options: {}
      })
      const res = getSchemaProperty(component, 'min', '[min placeholder]')
      expect(res).toBe(5)
    })

    it('should return alternative text if schema property undefined', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {
          min: undefined
        },
        options: {}
      })
      const res = getSchemaProperty(component, 'min', '[min placeholder]')
      expect(res).toBe('[min placeholder]')
    })

    it('should return alternative text if schema property missing', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {},
        options: {}
      })
      const res = getSchemaProperty(component, 'min', '[min placeholder]')
      expect(res).toBe('[min placeholder]')
    })
  })

  describe('getOptionsProperty', () => {
    it('should return options property', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {},
        options: {
          maxFuture: 15
        }
      })
      const res = getOptionsProperty(
        component,
        'maxFuture',
        '[max days in the future]'
      )
      expect(res).toBe(15)
    })

    it('should return alternative text if schema property undefined', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {},
        options: {
          maxFuture: undefined
        }
      })
      const res = getOptionsProperty(
        component,
        'maxFuture',
        '[max days in the future]'
      )
      expect(res).toBe('[max days in the future]')
    })

    it('should return alternative text if schema property missing', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {},
        options: {}
      })
      const res = getOptionsProperty(
        component,
        'maxFuture',
        '[max days in the future]'
      )
      expect(res).toBe('[max days in the future]')
    })
  })

  describe('isTypeForMinMax', () => {
    it('should return true for valid types', () => {
      expect(isTypeForMinMax(ComponentType.TextField)).toBeTruthy()
      expect(isTypeForMinMax(ComponentType.MultilineTextField)).toBeTruthy()
      expect(isTypeForMinMax(ComponentType.EmailAddressField)).toBeTruthy()
    })

    it('should return false for invalid types', () => {
      expect(isTypeForMinMax(ComponentType.NumberField)).toBeFalsy()
    })
  })

  describe('determineLimit', () => {
    const component = /** @type {ComponentDef} */ ({
      name: 'abcdef',
      title: 'Component title',
      type: ComponentType.TextField,
      schema: {
        min: 7,
        max: 30
      },
      options: {
        maxPast: 21,
        maxFuture: 35
      }
    })

    it.each([
      ComponentType.TextField,
      ComponentType.MultilineTextField,
      ComponentType.EmailAddressField
    ])(
      'should return correct limit for min and TextField/MultilineTextField/EmailAddress',
      (componentType) => {
        const componentLocal = /** @type {ComponentDef} */ ({
          ...component,
          type: componentType
        })
        const res = determineLimit('min', componentLocal)
        expect(res).toBe(7)
      }
    )

    it.each([
      ComponentType.TextField,
      ComponentType.MultilineTextField,
      ComponentType.EmailAddressField
    ])(
      'should return correct limit for mmax and TextField',
      (componentType) => {
        const componentLocal = /** @type {ComponentDef} */ ({
          ...component,
          type: componentType
        })
        const res = determineLimit('max', componentLocal)
        expect(res).toBe(30)
      }
    )

    it('should return correct limit for numberMin', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {
          min: 10,
          max: 25
        },
        options: {}
      })
      const res = determineLimit('numberMin', component)
      expect(res).toBe(10)
    })

    it('should return correct limit for numberMax', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {
          min: 10,
          max: 25
        },
        options: {}
      })
      const res = determineLimit('numberMax', component)
      expect(res).toBe(25)
    })

    it('should return correct limit for numberPrecision', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {
          min: 10,
          max: 25,
          precision: 3
        },
        options: {}
      })
      const res = determineLimit('numberPrecision', component)
      expect(res).toBe(3)
    })

    it('should return correct limit for dateMin', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {},
        options: {
          maxPast: 21,
          maxFuture: 35
        }
      })
      const res = determineLimit('dateMin', component)
      expect(res).toBe(21)
    })

    it('should return correct limit for dateMax', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {},
        options: {
          maxPast: 21,
          maxFuture: 35
        }
      })
      const res = determineLimit('dateMax', component)
      expect(res).toBe(35)
    })

    it('should return unknown for invalid type', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {},
        options: {}
      })
      const res = determineLimit('invalid', component)
      expect(res).toBe('[unknown]')
    })
  })

  describe('createErrorPreviewModel', () => {
    const questionId = componentId
    it('should throw if page not found', () => {
      const def = structuredClone(definitionWithComponentId)
      expect(() =>
        createErrorPreviewModel(def, 'wont-find-page', questionId)
      ).toThrow('No page found for form  path wont-find-page')
    })

    it('should throw if component not found', () => {
      const def = structuredClone(definitionWithComponentId)
      expect(() =>
        createErrorPreviewModel(def, 'page-one', 'invalid-id')
      ).toThrow(
        'No question found for form  path page-one questionId invalid-id'
      )
    })

    it('should return error messages inside object', () => {
      const def = structuredClone(definitionWithComponentId)
      const res = createErrorPreviewModel(def, 'page-one', questionId)
      expect(res.pageNum).toBe(1)
      expect(res.baseErrors).toHaveLength(1)
      expect(res.baseErrors[0]).toBe('Enter [short description]')
      expect(res.advancedSettingsErrors).toHaveLength(2)
      expect(res.advancedSettingsErrors[0]).toBe(
        '[short description] must be [min length] characters or more'
      )
      expect(res.advancedSettingsErrors[1]).toBe(
        '[short description] must be [max length] characters or less'
      )
    })
  })
})

/**
 * @import { ComponentDef } from '@defra/forms-model'
 */
