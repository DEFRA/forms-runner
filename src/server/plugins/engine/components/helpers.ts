import { ComponentType, type ComponentDef } from '@defra/forms-model'

import * as Components from '~/src/server/plugins/engine/components/index.js'
import { type FormModel } from '~/src/server/plugins/engine/models/FormModel.js'

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
  model: FormModel
): ComponentFieldClass | undefined {
  let component: ComponentFieldClass | undefined

  switch (def.type) {
    case ComponentType.AutocompleteField:
      component = new Components.AutocompleteField(def, model)
      break

    case ComponentType.CheckboxesField:
      component = new Components.CheckboxesField(def, model)
      break

    case ComponentType.DatePartsField:
      component = new Components.DatePartsField(def, model)
      break

    case ComponentType.Details:
      component = new Components.Details(def, model)
      break

    case ComponentType.EmailAddressField:
      component = new Components.EmailAddressField(def, model)
      break

    case ComponentType.Html:
      component = new Components.Html(def, model)
      break

    case ComponentType.InsetText:
      component = new Components.InsetText(def, model)
      break

    case ComponentType.List:
      component = new Components.List(def, model)
      break

    case ComponentType.MultilineTextField:
      component = new Components.MultilineTextField(def, model)
      break

    case ComponentType.NumberField:
      component = new Components.NumberField(def, model)
      break

    case ComponentType.RadiosField:
      component = new Components.RadiosField(def, model)
      break

    case ComponentType.SelectField:
      component = new Components.SelectField(def, model)
      break

    case ComponentType.TelephoneNumberField:
      component = new Components.TelephoneNumberField(def, model)
      break

    case ComponentType.TextField:
      component = new Components.TextField(def, model)
      break

    case ComponentType.UkAddressField:
      component = new Components.UkAddressField(def, model)
      break

    case ComponentType.YesNoField:
      component = new Components.YesNoField(def, model)
      break

    case ComponentType.MonthYearField:
      component = new Components.MonthYearField(def, model)
      break

    case ComponentType.FileUploadField:
      component = new Components.FileUploadField(def, model)
      break
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
