import { randomUUID } from 'node:crypto'

import {
  ComponentType,
  ControllerType,
  hasComponentsEvenIfNoNext,
  hasFormField
} from '@defra/forms-model'

/**
 * @type {Partial<Record<string, (name: string, value: RichFormValue | null) => Record<string, FormStateValue>>>}
 */
const stateMappers = {
  [ComponentType.UkAddressField]: mapUkAddress,
  [ComponentType.MonthYearField]: mapMonthYear,
  [ComponentType.DatePartsField]: mapDateParts,
  [ComponentType.EastingNorthingField]: mapEastingNorthing,
  [ComponentType.LatLongField]: mapLatLong
}

/**
 * Turns a form submission document into data suitable for session state
 * @param {FormSubmissionDocument} formSubmissionMessage
 * @param {FormDefinition} definition
 */
export function mapValueToState(formSubmissionMessage, definition) {
  const main = /** @type {Record<string, FormStateValue>} */ ({})
  const repeaters = /** @type {Record<string, FormStateValue>} */ ({})
  const { main: submittedMain, repeaters: submittedRepeaters } =
    formSubmissionMessage.data

  for (const page of definition.pages) {
    const components = getStateComponents(page)

    if (components.length === 0) {
      continue
    }

    if (page.controller === ControllerType.Repeat) {
      const name = page.repeat.options.name
      repeaters[name] = mapRepeaterItems(submittedRepeaters[name], components)
      continue
    }

    Object.assign(main, mapComponents(components, submittedMain))
  }

  return {
    ...main,
    ...repeaters
  }
}

/**
 * @param {Page} page
 * @returns {ComponentDef[]}
 */
function getStateComponents(page) {
  if (!hasComponentsEvenIfNoNext(page)) {
    return []
  }

  return page.components.filter(
    (component) =>
      hasFormField(component) && isAllowedForStateMapping(component)
  )
}

/**
 * Returns true if the component type can be copied from a previous submission
 * @param {ComponentDef} component
 */
function isAllowedForStateMapping(component) {
  return (
    component.type !== ComponentType.DeclarationField &&
    component.type !== ComponentType.FileUploadField &&
    component.type !== ComponentType.PaymentField
  )
}

/**
 * @param {ComponentDef[]} components
 * @param {Record<string, RichFormValue | null>} submitted
 */
function mapComponents(components, submitted) {
  return components.reduce(
    (state, component) =>
      Object.assign(state, assignState(component, submitted)),
    /** @type {Record<string, FormStateValue>} */ ({})
  )
}

/**
 * @param {Record<string, RichFormValue | null>[]} items
 * @param {ComponentDef[]} components
 */
function mapRepeaterItems(items, components) {
  return items.map((item) => ({
    ...mapComponents(components, item),
    itemId: randomUUID()
  }))
}

/**
 * @param {ComponentDef} component
 * @param {Record<string, RichFormValue | null>} submitted
 */
function assignState(component, submitted) {
  const componentName = component.name
  const submittedValue = submitted[componentName]
  const mapper = stateMappers[component.type]

  // Skip if the value is undefined - this will be a new question not present in the copied submission
  if (submittedValue === undefined) {
    return {}
  }

  if (mapper) {
    return mapper(componentName, submittedValue)
  }

  return {
    [componentName]: submittedValue
  }
}

/**
 * @param {string} name
 * @param {RichFormValue | null} value
 */
function mapUkAddress(name, value) {
  const submittedValue = /** @type {UkAddressState | null} */ (value)

  return {
    [`${name}__uprn`]:
      submittedValue && 'uprn' in submittedValue ? submittedValue.uprn : '',
    [`${name}__addressLine1`]: submittedValue
      ? submittedValue.addressLine1
      : null,
    [`${name}__addressLine2`]: submittedValue
      ? submittedValue.addressLine2
      : null,
    [`${name}__town`]: submittedValue ? submittedValue.town : null,
    [`${name}__county`]: submittedValue ? submittedValue.county : null,
    [`${name}__postcode`]: submittedValue ? submittedValue.postcode : null
  }
}

/**
 * @param {string} name
 * @param {RichFormValue | null} value
 */
function mapMonthYear(name, value) {
  const submittedValue = /** @type {MonthYearState | null} */ (value)

  return {
    [`${name}__month`]: submittedValue ? submittedValue.month : null,
    [`${name}__year`]: submittedValue ? submittedValue.year : null
  }
}

/**
 * @param {string} name
 * @param {RichFormValue | null} value
 */
function mapDateParts(name, value) {
  const submittedValue = /** @type {DatePartsState | null} */ (value)

  return {
    [`${name}__day`]: submittedValue ? submittedValue.day : null,
    [`${name}__month`]: submittedValue ? submittedValue.month : null,
    [`${name}__year`]: submittedValue ? submittedValue.year : null
  }
}

/**
 * @param {string} name
 * @param {RichFormValue | null} value
 */
function mapEastingNorthing(name, value) {
  const submittedValue = /** @type {EastingNorthingState | null} */ (value)

  return {
    [`${name}__easting`]: submittedValue ? submittedValue.easting : null,
    [`${name}__northing`]: submittedValue ? submittedValue.northing : null
  }
}

/**
 * @param {string} name
 * @param {RichFormValue | null} value
 */
function mapLatLong(name, value) {
  const submittedValue = /** @type {LatLongState | null} */ (value)

  return {
    [`${name}__latitude`]: submittedValue ? submittedValue.latitude : null,
    [`${name}__longitude`]: submittedValue ? submittedValue.longitude : null
  }
}
/**
 * @import { FormDefinition, ComponentDef, Page } from '@defra/forms-model'
 * @import { FormStateValue, RichFormValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormSubmissionDocument } from '~/src/server/services/submissionService.js'
 * @import { UkAddressState, MonthYearState, DatePartsState, EastingNorthingState, LatLongState } from '@defra/forms-engine-plugin/types'
 */
