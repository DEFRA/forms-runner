import { type ComponentDef } from '@defra/forms-model'

import * as Components from '~/src/server/plugins/engine/components/index.js'

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
