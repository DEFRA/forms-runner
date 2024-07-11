import { type ComponentDef } from '@defra/forms-model'
import { add, startOfToday, sub } from 'date-fns'
import joi from 'joi'

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

/**
 * FIXME:- this code is bonkers. buildFormSchema and buildState schema are duplicates.
 * The xxField classes should be responsible for generating their own schemas.
 */
export function buildSchema(type, keys) {
  const schema = type?.isJoi ? type : joi[type?.type ?? type]()

  Object.keys(keys).forEach((key) => {
    let val = keys[key]
    if (key === 'regex') {
      val = new RegExp(val)
    }
    schema[key](typeof val === 'boolean' ? undefined : val)
  })

  return schema
}

export function buildFormSchema(schemaType, component, isRequired = true) {
  let schema = buildSchema(schemaType, component.schema)

  if (isRequired) {
    schema = schema.required()
  }

  if (component.title) {
    schema = schema.label(component.title.toLowerCase())
  }

  if (component.options.required === false) {
    schema = schema.allow(null, '').optional()
  }

  if (schema.trim && component.schema.trim !== false) {
    schema = schema.trim()
  }

  return schema
}

export function buildStateSchema(schemaType, component) {
  let schema = buildSchema(schemaType, component.schema)

  if (component.title) {
    schema = schema.label(component.title.toLowerCase())
  }

  if (component.options.required !== false) {
    schema = schema.required()
  }

  if (component.options.required === false) {
    schema = schema.allow(null, '').optional()
  }

  if (schema.trim && component.schema.trim !== false) {
    schema = schema.trim()
  }

  return schema
}

export function getFormSchemaKeys(_name, schemaType, component) {
  const schema = buildFormSchema(schemaType, component)

  return { [component.name]: schema }
}

export function getStateSchemaKeys(name, schemaType, component) {
  const schema = buildStateSchema(schemaType, component)

  return { [name]: schema }
}

export const addClassOptionIfNone = (
  options: { classes?: string; [prop: string]: any },
  className: string
) => {
  if (!options.classes) {
    options.classes = className
  }
}
export function getCustomDateValidator(
  maxDaysInPast?: number,
  maxDaysInFuture?: number
) {
  return (value: Date, helpers: joi.CustomHelpers) => {
    if (maxDaysInPast) {
      const minDate = sub(startOfToday(), { days: maxDaysInPast })
      if (value < minDate) {
        return helpers.error('date.min', {
          label: helpers.state.key,
          limit: minDate
        })
      }
    }
    if (maxDaysInFuture) {
      const maxDate = add(startOfToday(), { days: maxDaysInFuture })
      if (value > maxDate) {
        return helpers.error('date.max', {
          label: helpers.state.key,
          limit: maxDate
        })
      }
    }
    return value
  }
}
