import { randomUUID } from 'node:crypto'

import {
  ComponentType,
  ControllerType,
  hasComponentsEvenIfNoNext,
  hasFormField
} from '@defra/forms-model'

/**
 * Turns a form submission document into data suitable for session state
 * @param {FormSubmissionDocument} formSubmissionMessage
 * @param {FormDefinition} definition
 */
export function mapValueToState(formSubmissionMessage, definition) {
  const submittedMain = formSubmissionMessage.data.main
  const submittedRepeaters = formSubmissionMessage.data.repeaters

  const main = {}
  const repeaters = {}

  // Only copy form fields and ignore declarations
  const componentFilter = (/** @type {ComponentDef} */ c) =>
    hasFormField(c) &&
    c.type !== ComponentType.DeclarationField &&
    c.type !== ComponentType.FileUploadField

  for (const page of definition.pages) {
    if (!hasComponentsEvenIfNoNext(page)) {
      continue
    }

    if (page.controller === ControllerType.Repeat) {
      const submittedItems = submittedRepeaters[page.repeat.options.name]
      const copiedItems = []

      for (const item of submittedItems) {
        const copiedItem = {
          itemId: randomUUID()
        }

        for (const component of page.components.filter(componentFilter)) {
          Object.assign(copiedItem, assignState(component, item))
        }

        copiedItems.push(copiedItem)
      }
      Object.assign(repeaters, { [page.repeat.options.name]: copiedItems })
    } else {
      for (const component of page.components.filter(componentFilter)) {
        Object.assign(main, assignState(component, submittedMain))
      }
    }
  }

  return {
    ...main,
    ...repeaters
  }
}

/**
 * @param {ComponentDef} component
 * @param {Record<string, RichFormValue | null>} submitted
 */
function assignState(component, submitted) {
  const componentName = component.name

  switch (component.type) {
    case ComponentType.UkAddressField: {
      const submittedValue = /** @type {UkAddressState | null} */ (
        submitted[componentName]
      )

      return {
        [`${componentName}__uprn`]:
          submittedValue && 'uprn' in submittedValue ? submittedValue.uprn : '',
        [`${componentName}__addressLine1`]: submittedValue
          ? submittedValue.addressLine1
          : null,
        [`${componentName}__addressLine2`]: submittedValue
          ? submittedValue.addressLine2
          : null,
        [`${componentName}__town`]: submittedValue ? submittedValue.town : null,
        [`${componentName}__county`]: submittedValue
          ? submittedValue.county
          : null,
        [`${componentName}__postcode`]: submittedValue
          ? submittedValue.postcode
          : null
      }
    }
    case ComponentType.MonthYearField: {
      const submittedValue = /** @type {MonthYearState | null} */ (
        submitted[componentName]
      )

      return {
        [`${componentName}__month`]: submittedValue
          ? submittedValue.month
          : null,
        [`${componentName}__year`]: submittedValue ? submittedValue.year : null
      }
    }
    case ComponentType.DatePartsField: {
      const submittedValue = /** @type {DatePartsState | null} */ (
        submitted[componentName]
      )

      return {
        [`${componentName}__day`]: submittedValue ? submittedValue.day : null,
        [`${componentName}__month`]: submittedValue
          ? submittedValue.month
          : null,
        [`${componentName}__year`]: submittedValue ? submittedValue.year : null
      }
    }
    case ComponentType.EastingNorthingField: {
      const submittedValue = /** @type {EastingNorthingState | null} */ (
        submitted[componentName]
      )

      return {
        [`${componentName}__easting`]: submittedValue
          ? submittedValue.easting
          : null,
        [`${componentName}__northing`]: submittedValue
          ? submittedValue.northing
          : null
      }
    }
    case ComponentType.LatLongField: {
      const submittedValue = /** @type {LatLongState | null} */ (
        submitted[componentName]
      )

      return {
        [`${componentName}__latitude`]: submittedValue
          ? submittedValue.latitude
          : null,
        [`${componentName}__longitude`]: submittedValue
          ? submittedValue.longitude
          : null
      }
    }
    default: {
      const submittedValue = submitted[componentName]

      return {
        [componentName]: submittedValue ?? null
      }
    }
  }
}
/**
 * @import { FormDefinition, ComponentDef } from '@defra/forms-model'
 * @import { RichFormValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormSubmissionDocument } from '~/src/server/services/submissionService.js'
 * @import { UkAddressState, MonthYearState, DatePartsState, EastingNorthingState, LatLongState } from '@defra/forms-engine-plugin/types'
 */
