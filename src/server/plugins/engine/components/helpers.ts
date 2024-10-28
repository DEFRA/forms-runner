import { type ComponentDef } from '@defra/forms-model'
import { add, startOfToday, sub } from 'date-fns'
import { type CustomValidator } from 'joi'

import * as Components from '~/src/server/plugins/engine/components/index.js'
import { type FormPayload } from '~/src/server/plugins/engine/types.js'

export type ComponentFieldClass = InstanceType<ComponentFieldType>
export type ComponentFieldType = (typeof Components)[keyof typeof Components]

export type FormComponentFieldClass = InstanceType<FormComponentFieldType>
export type FormComponentFieldType =
  | typeof Components.AutocompleteField
  | typeof Components.CheckboxesField
  | typeof Components.DatePartsField
  | typeof Components.EmailAddressField
  | typeof Components.MonthYearField
  | typeof Components.MultilineTextField
  | typeof Components.NumberField
  | typeof Components.SelectField
  | typeof Components.TelephoneNumberField
  | typeof Components.TextField
  | typeof Components.UkAddressField
  | typeof Components.FileUploadField

export function hasComponentField(
  componentType: string
): componentType is keyof typeof Components {
  return componentType in Components
}

/**
 * Gets the field class for each {@link ComponentDef} type
 */
export function getComponentField(component: ComponentDef) {
  const { type } = component

  if (!hasComponentField(type)) {
    return
  }

  return Components[type]
}

export const addClassOptionIfNone = (
  options: Extract<ComponentDef, { options: { classes?: string } }>['options'],
  className: string
) => {
  if (!options.classes) {
    options.classes = className
  }
}

export function getCustomDateValidator(component: Components.DatePartsField) {
  const { options } = component

  const validator: CustomValidator = (payload: FormPayload, helpers) => {
    const value = component.getStateValueFromValidForm(payload)
    const date = value ? new Date(value) : undefined

    if (!date) {
      return options.required !== false
        ? helpers.error('date.base') // Date required
        : payload
    }

    // Minimum date from today
    const dateMin = options.maxDaysInPast
      ? sub(startOfToday(), { days: options.maxDaysInPast })
      : undefined

    // Maximum date from today
    const dateMax = options.maxDaysInFuture
      ? add(startOfToday(), { days: options.maxDaysInFuture })
      : undefined

    if (dateMin && date < dateMin) {
      return helpers.error('date.min', {
        label: helpers.state.key,
        limit: dateMin
      })
    }

    if (dateMax && date > dateMax) {
      return helpers.error('date.max', {
        label: helpers.state.key,
        limit: dateMax
      })
    }

    return payload
  }

  return validator
}
