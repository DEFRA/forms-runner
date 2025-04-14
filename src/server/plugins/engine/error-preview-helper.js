import { ComponentType, hasComponents } from '@defra/forms-model'
import Boom from '@hapi/boom'
import Joi from 'joi'

import { createComponent } from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'

/**
 * @param {ComponentDef} component
 * @param {string} propertyName
 * @param {string} fallbackText
 * @returns {string}
 */
export function getSchemaProperty(component, propertyName, fallbackText) {
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
  return (
    // @ts-expect-error - need to dynamically lookup property
    ('options' in component ? component.options[propertyName] : undefined) ??
    fallbackText
  )
}

/**
 * Determine the limit (if any) relevant to the error type
 * @param {string} type
 * @param {ComponentDef} component
 * @returns { number | string | undefined }
 */
export function determineLimit(type, component) {
  if (
    type === 'min' &&
    (component.type === ComponentType.TextField ||
      component.type === ComponentType.MultilineTextField ||
      component.type === ComponentType.EmailAddressField)
  ) {
    return getSchemaProperty(component, 'min', '[min length]')
  }

  if (
    type === 'max' &&
    (component.type === ComponentType.TextField ||
      component.type === ComponentType.MultilineTextField ||
      component.type === ComponentType.EmailAddressField)
  ) {
    return getSchemaProperty(component, 'max', '[max length]')
  }

  if (type === 'numberMin') {
    return getSchemaProperty(component, 'min', '[lowest number]')
  }

  if (type === 'numberMax') {
    return getSchemaProperty(component, 'max', '[highest number]')
  }

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
 * @param { typeof Joi.expression | string } template
 * @param {{ label?: string, limit?: number | string, title?: string }} [local]
 * @returns {string}
 */
export function expandTemplate(template, local = {}) {
  const options = { errors: { escapeHtml: false } }
  const prefs = { errors: { wrap: { label: false } } }

  const templateExpression =
    typeof template === 'string' ? Joi.expression(template) : template

  return templateExpression.render('', {}, prefs, local, options)
}

/**
 * @import { ComponentDef, FormDefinition } from '@defra/forms-model'
 * @import { ErrorMessageTemplate } from './types.js'
 */
