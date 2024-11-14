import { ComponentType, type ComponentDef } from '@defra/forms-model'

import { type ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
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

/**
 * Create field instance for each {@link ComponentDef} type
 */
export function createComponentField(
  def: ComponentDef,
  options: ConstructorParameters<typeof ComponentBase>[1]
): ComponentFieldClass {
  let component: ComponentFieldClass | undefined

  switch (def.type) {
    case ComponentType.AutocompleteField:
      component = new Components.AutocompleteField(def, options)
      break

    case ComponentType.CheckboxesField:
      component = new Components.CheckboxesField(def, options)
      break

    case ComponentType.DatePartsField:
      component = new Components.DatePartsField(def, options)
      break

    case ComponentType.Details:
      component = new Components.Details(def, options)
      break

    case ComponentType.EmailAddressField:
      component = new Components.EmailAddressField(def, options)
      break

    case ComponentType.Html:
      component = new Components.Html(def, options)
      break

    case ComponentType.InsetText:
      component = new Components.InsetText(def, options)
      break

    case ComponentType.List:
      component = new Components.List(def, options)
      break

    case ComponentType.MultilineTextField:
      component = new Components.MultilineTextField(def, options)
      break

    case ComponentType.NumberField:
      component = new Components.NumberField(def, options)
      break

    case ComponentType.RadiosField:
      component = new Components.RadiosField(def, options)
      break

    case ComponentType.SelectField:
      component = new Components.SelectField(def, options)
      break

    case ComponentType.TelephoneNumberField:
      component = new Components.TelephoneNumberField(def, options)
      break

    case ComponentType.TextField:
      component = new Components.TextField(def, options)
      break

    case ComponentType.UkAddressField:
      component = new Components.UkAddressField(def, options)
      break

    case ComponentType.YesNoField:
      component = new Components.YesNoField(def, options)
      break

    case ComponentType.MonthYearField:
      component = new Components.MonthYearField(def, options)
      break

    case ComponentType.FileUploadField:
      component = new Components.FileUploadField(def, options)
      break
  }

  if (typeof component === 'undefined') {
    throw new Error(`Component type ${def.type} does not exist`)
  }

  return component
}

export const addClassOptionIfNone = (
  options: Extract<ComponentDef, { options: { classes?: string } }>['options'],
  className: string
) => {
  if (!options.classes) {
    options.classes = className
  }
}
