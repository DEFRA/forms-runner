import { ComponentType } from '@defra/forms-model'

import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  createErrorPreviewModel,
  determineLimit,
  evaluateErrorTemplates,
  expandTemplate,
  getOptionsProperty,
  getSchemaProperty,
  isTypeForMinMax,
  lookupFileTypes
} from '~/src/server/plugins/error-preview/error-preview-helper.js'
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

    it('should return alternative text if schema structure missing', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
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

    it('should return alternative text if options property undefined', () => {
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

    it('should return alternative text if options property missing', () => {
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

    it('should return alternative text if options structure missing', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {}
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
          precision: 2
        },
        options: {}
      })
      const res = determineLimit('numberPrecision', component)
      expect(res).toBe(2)
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

    it('should return correct limit for filesMin', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.FileUploadField,
        schema: {
          min: 1,
          max: 3
        },
        options: {}
      })
      const res = determineLimit('filesMin', component)
      expect(res).toBe(1)
    })

    it('should return correct limit for filesMax', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.FileUploadField,
        schema: {
          min: 1,
          max: 3
        },
        options: {}
      })
      const res = determineLimit('filesMax', component)
      expect(res).toBe(3)
    })

    it('should return correct limit for filesExact', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.FileUploadField,
        schema: {
          length: 2
        },
        options: {}
      })
      const res = determineLimit('filesExact', component)
      expect(res).toBe(2)
    })

    it('should return correct limit for filesMimes', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.FileUploadField,
        schema: {},
        options: {
          accept: 'application/pdf'
        }
      })
      const res = determineLimit('filesMimes', component)
      expect(res).toBe('PDF')
    })

    it('should return unknown for invalid number type', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.NumberField,
        schema: {},
        options: {}
      })
      const res = determineLimit('numberInvalid', component)
      expect(res).toBe('[unknown]')
    })

    it('should return unknown for invalid date type', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.DatePartsField,
        schema: {},
        options: {}
      })
      const res = determineLimit('dateInvalid', component)
      expect(res).toBe('[unknown]')
    })

    it('should return unknown for invalid file type', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.FileUploadField,
        schema: {},
        options: {}
      })
      const res = determineLimit('filesInvalid', component)
      expect(res).toBe('[unknown]')
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

  describe('evaluateErrorTemplates', () => {
    it('should render all templates using short description', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        shortDescription: 'Your full name',
        type: ComponentType.TextField,
        schema: {
          min: 5,
          max: 30
        },
        options: {}
      })

      const templates = /** @type {ErrorMessageTemplate[]} */ ([
        { type: 'required', template: messageTemplate.required },
        { type: 'min', template: messageTemplate.min },
        { type: 'max', template: messageTemplate.max }
      ])
      const res = evaluateErrorTemplates(templates, component)
      expect(res).toHaveLength(3)
      expect(res[0]).toBe('Enter your full name')
      expect(res[1]).toBe('Your full name must be 5 characters or more')
      expect(res[2]).toBe('Your full name must be 30 characters or less')
    })

    it('should render all templates with short description placeholder', () => {
      const component = /** @type {ComponentDef} */ ({
        name: 'abcdef',
        title: 'Component title',
        type: ComponentType.TextField,
        schema: {
          min: 5,
          max: 30
        },
        options: {}
      })

      const templates = /** @type {ErrorMessageTemplate[]} */ ([
        { type: 'required', template: messageTemplate.required },
        { type: 'min', template: messageTemplate.min },
        { type: 'max', template: messageTemplate.max }
      ])
      const res = evaluateErrorTemplates(templates, component)
      expect(res).toHaveLength(3)
      expect(res[0]).toBe('Enter [short description]')
      expect(res[1]).toBe('[short description] must be 5 characters or more')
      expect(res[2]).toBe('[short description] must be 30 characters or less')
    })
  })

  describe('lookupFileTypes', () => {
    test('should ignore when not file upload Field', () => {
      const res = lookupFileTypes('')
      expect(res).toBe('[files types you accept]')
    })

    test('should handle doc types', () => {
      const res = lookupFileTypes(
        'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
      expect(res).toBe('DOC or DOCX')
    })

    test('should handle image types', () => {
      const res = lookupFileTypes('image/jpeg')
      expect(res).toBe('JPG')
    })

    test('should handle tabular data types', () => {
      const res = lookupFileTypes('text/csv')
      expect(res).toBe('CSV')
    })

    test('should handle all types', () => {
      const res = lookupFileTypes('text/csv,image/jpeg,application/msword')
      expect(res).toBe('DOC, JPG or CSV')
    })
  })
})

/**
 * @import { ComponentDef } from '@defra/forms-model'
 * @import { ErrorMessageTemplate } from '~/src/server/plugins/engine/types.js'
 */
