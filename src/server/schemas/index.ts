import { type FormPayloadParams } from '@defra/forms-engine-plugin/engine/types.js'
import Joi from 'joi'

import { FormAction, FormStatus } from '~/src/server/routes/types.js'

export const stateSchema = Joi.string<FormStatus>()
  .valid(FormStatus.Draft, FormStatus.Live)
  .required()

export const actionSchema = Joi.string<FormAction>()
  .valid(
    FormAction.Continue,
    FormAction.Validate,
    FormAction.Delete,
    FormAction.AddAnother,
    FormAction.Send
  )
  .default(FormAction.Validate)
  .optional()

export const pathSchema = Joi.string().required()
export const itemIdSchema = Joi.string().uuid().required()
export const crumbSchema = Joi.string().optional().allow('')
export const confirmSchema = Joi.boolean().empty(false)

export const paramsSchema = Joi.object<FormPayloadParams>()
  .keys({
    action: actionSchema,
    confirm: confirmSchema,
    crumb: crumbSchema,
    itemId: itemIdSchema.optional()
  })
  .default({})
  .optional()
