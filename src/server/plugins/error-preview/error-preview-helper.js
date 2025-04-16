import {
  ComponentType,
  allDocumentTypes,
  allImageTypes,
  allTabularDataTypes,
  hasComponents
} from '@defra/forms-model'
import Boom from '@hapi/boom'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { createComponent } from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { createJoiExpression } from '~/src/server/utils/type-utils.js'

/**
 * @param {ComponentDef} component
 * @param {string} propertyName
 * @param {string} fallbackText
 * @returns { string | number }
 */
export function getSchemaProperty(component, propertyName, fallbackText) {
  const schema =
    /** @type {Record<string, string | number | undefined> | undefined} */ (
      'schema' in component ? component.schema : undefined
    )
  const schemaVal = schema ? schema[propertyName] : undefined
  return schemaVal ?? fallbackText
}

/**
 * @param {ComponentDef} component
 * @param {string} propertyName
 * @param {string} fallbackText
 * @returns { string | number }
 */
export function getOptionsProperty(component, propertyName, fallbackText) {
  const options =
    /** @type {Record<string, string | number | undefined> | undefined} */ (
      'options' in component ? component.options : undefined
    )
  const optionsVal = options ? options[propertyName] : undefined
  return optionsVal ?? fallbackText
}

/**
 * @param {ComponentType} type
 */
export function isTypeForMinMax(type) {
  return (
    type === ComponentType.TextField ||
    type === ComponentType.MultilineTextField ||
    type === ComponentType.EmailAddressField
  )
}

/**
 * @param {string[]} selectedMimeTypesFromCSV
 * @param {{ value: string; text: string; mimeType: string; }[]} allTypes
 */
export function findFileTypeMappings(selectedMimeTypesFromCSV, allTypes) {
  return selectedMimeTypesFromCSV
    .map((currMimeType) => {
      const found = allTypes.find((dt) => dt.mimeType === currMimeType)
      return found ? found.text : undefined
    })
    .filter((x) => typeof x === 'string')
}

/**
 * @param {string} types
 * @returns {string}
 */
export function lookupFileTypes(types) {
  const selectedMimeTypesFromCSV = types ? types.split(',') : []

  const documentTypes = findFileTypeMappings(
    selectedMimeTypesFromCSV,
    allDocumentTypes
  )

  const imageTypes = findFileTypeMappings(
    selectedMimeTypesFromCSV,
    allImageTypes
  )

  const tabularDataTypes = findFileTypeMappings(
    selectedMimeTypesFromCSV,
    allTabularDataTypes
  )

  const totalTypes = documentTypes.concat(imageTypes).concat(tabularDataTypes)

  const lastItem = totalTypes.pop()

  if (!lastItem) {
    return '[files types you accept]'
  }

  const penultimate = totalTypes.pop()

  if (!penultimate) {
    return lastItem
  }

  return [...totalTypes, `${penultimate} or ${lastItem}`].join(', ')
}

/**
 * @param {ComponentDef} component
 * @param {string} type
 * @returns { string | number }
 */
export function getNumberLimits(component, type) {
  if (type === 'numberMin') {
    return getSchemaProperty(component, 'min', '[lowest number]')
  }

  if (type === 'numberMax') {
    return getSchemaProperty(component, 'max', '[highest number]')
  }

  if (type === 'numberPrecision') {
    return getSchemaProperty(component, 'precision', '[precision]')
  }

  return '[unknown]'
}

/**
 * @param {ComponentDef} component
 * @param {string} type
 * @returns { string | number }
 */
export function getDateLimits(component, type) {
  if (type === 'dateMin') {
    return getOptionsProperty(component, 'maxPast', '[max days in the past]')
  }

  if (type === 'dateMax') {
    return getOptionsProperty(
      component,
      'maxFuture',
      '[max days in the future]'
    )
  }

  return '[unknown]'
}

/**
 * @param {ComponentDef} component
 * @param {string} type
 * @returns { string | number }
 */
export function getFileLimits(component, type) {
  if (type === 'filesMin') {
    return getSchemaProperty(component, 'min', '[min file count]')
  }

  if (type === 'filesMax') {
    return getSchemaProperty(component, 'max', '[max file count]')
  }

  if (type === 'filesExact') {
    return getSchemaProperty(component, 'length', '[exact file count]')
  }

  if (type === 'filesMimes') {
    const accept = getOptionsProperty(component, 'accept', '')
    return lookupFileTypes(typeof accept === 'string' ? accept : '')
  }

  return '[unknown]'
}

/**
 * Determine the limit (if any) relevant to the error type
 * @param {string} type
 * @param {ComponentDef} component
 * @returns { number | string }
 */
export function determineLimit(type, component) {
  if (type === 'min' && isTypeForMinMax(component.type)) {
    return getSchemaProperty(component, 'min', '[min length]')
  }

  if (type === 'max' && isTypeForMinMax(component.type)) {
    return getSchemaProperty(component, 'max', '[max length]')
  }

  if (type.startsWith('number')) {
    return getNumberLimits(component, type)
  }

  if (type.startsWith('date')) {
    return getDateLimits(component, type)
  }

  if (type.startsWith('files')) {
    return getFileLimits(component, type)
  }

  return '[unknown]'
}

/**
 * @param {ErrorMessageTemplate[]} templates
 * @param {ComponentDef} component
 */
export function evaluateErrorTemplates(templates, component) {
  return templates.map((templ) => {
    return expandTemplate(templ.template, {
      label:
        'shortDescription' in component
          ? component.shortDescription
          : '[short description]',
      title:
        'shortDescription' in component
          ? component.shortDescription
          : '[short description]',
      limit: determineLimit(templ.type, component)
    })
  })
}

/**
 * @param {FormDefinition} definition
 * @param {string} path
 * @param {string} questionId
 */
export function createErrorPreviewModel(definition, path, questionId) {
  const pageIdx = definition.pages.findIndex((x) => x.path === `/${path}`)
  if (pageIdx === -1) {
    throw Boom.notFound(
      `No page found for form ${definition.name} path ${path}`
    )
  }

  const page = definition.pages[pageIdx]
  const component = hasComponents(page)
    ? page.components.find((x) => x.id === questionId)
    : undefined

  if (!component) {
    throw Boom.notFound(
      `No question found for form ${definition.name} path ${path} questionId ${questionId}`
    )
  }

  const dummyFormModel = new FormModel(
    { pages: [], conditions: [], lists: [], sections: [] },
    { basePath: '' }
  )
  const componentClass = createComponent(component, { model: dummyFormModel })
  const errors =
    componentClass instanceof FormComponent
      ? componentClass.getAllPossibleErrors()
      : { baseErrors: [], advancedSettingsErrors: [] }

  const baseErrors = evaluateErrorTemplates(errors.baseErrors, component)
  const advancedSettingsErrors = evaluateErrorTemplates(
    errors.advancedSettingsErrors,
    component
  )

  return {
    pageNum: pageIdx + 1,
    baseErrors,
    advancedSettingsErrors
  }
}

/**
 * Render a Joi template (expression) or tokenised string to generate complete error message
 * @param { JoiExpression | string } template
 * @param {{ label?: string, limit?: number | string, title?: string }} [local]
 * @returns {string}
 */
export function expandTemplate(template, local = {}) {
  const options = { errors: { escapeHtml: false } }
  const prefs = { errors: { wrap: { label: false } } }

  const templateExpression =
    typeof template === 'string' ? createJoiExpression(template) : template

  // @ts-expect-error Joi types are messed up
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return templateExpression.render('', {}, prefs, local, options)
}

/**
 * @import { ComponentDef, FormDefinition } from '@defra/forms-model'
 * @import { JoiExpression } from 'joi'
 * @import { ErrorMessageTemplate } from '~/src/server/plugins/engine/types.js'
 */
