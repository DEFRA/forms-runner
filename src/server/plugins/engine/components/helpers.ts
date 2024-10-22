import { type ComponentDef } from '@defra/forms-model'
import { add, startOfToday, sub } from 'date-fns'
import { type CustomHelpers } from 'joi'

import * as Components from '~/src/server/plugins/engine/components/index.js'
import { type FormState } from '~/src/server/plugins/engine/types.js'

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
  const { maxDaysInPast, maxDaysInFuture } = component.options

  return (state: FormState, helpers: CustomHelpers) => {
    const { day, month, year } = component.getFormValueFromState(state) ?? {}
    const date = new Date(`${year}-${month}-${day}`)

    if (maxDaysInPast) {
      const minDate = sub(startOfToday(), { days: maxDaysInPast })

      if (date < minDate) {
        return helpers.error('date.min', {
          label: helpers.state.key,
          limit: minDate
        })
      }
    }

    if (maxDaysInFuture) {
      const maxDate = add(startOfToday(), { days: maxDaysInFuture })

      if (date > maxDate) {
        return helpers.error('date.max', {
          label: helpers.state.key,
          limit: maxDate
        })
      }
    }

    return state
  }
}
