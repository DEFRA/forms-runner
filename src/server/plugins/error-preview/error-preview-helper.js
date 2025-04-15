import { ComponentType, hasComponents } from '@defra/forms-model'
import Boom from '@hapi/boom'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { createComponent } from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { createJoiExpression } from '~/src/server/utils/type-utils.js'

/**
 * @param {ComponentDef} component
 * @param {string} propertyName
 * @param {string} fallbackText
 * @returns {string}
 */
export function getSchemaProperty(component, propertyName, fallbackText) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (
    // @ts-expect-error - need to dynamically lookup property
    ('schema' in component ? component.schema[propertyName] : undefined) ??
    fallbackText
  )
}

/**
 * @param {ComponentDef} component
 * @param {string} propertyName
 * @param {string} fallbackText
 * @returns {string}
 */
export function getOptionsProperty(component, propertyName, fallbackText) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (
    // @ts-expect-error - need to dynamically lookup property
    ('options' in component ? component.options[propertyName] : undefined) ??
    fallbackText
  )
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
 * @param {ComponentDef} component
 * @param {string} type
 * @returns {string}
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
 * @returns {string}
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
 * @returns {string}
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

  return '[unknown]'
}

/**
 * Determine the limit (if any) relevant to the error type
 * @param {string} type
 * @param {ComponentDef} component
 * @returns { number | string | undefined }
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
        component instanceof FormComponent
          ? component.label
          : '[short description]',
      title:
        component instanceof FormComponent
          ? component.label
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
  const errors = componentClass.getAllPossibleErrors()

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
