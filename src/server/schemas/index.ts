import Joi from 'joi'

import { FormAction, FormStatus } from '~/src/server/routes/types.js'

export const stateSchema = Joi.string()
  .valid(FormStatus.Draft, FormStatus.Live)
  .required()

export const actionSchema = Joi.string()
  .valid(
    FormAction.Continue,
    FormAction.Delete,
    FormAction.AddAnother,
    FormAction.Send
  )
  .default(FormAction.Continue)
  .optional()

export const pathSchema = Joi.string().required()
export const itemIdSchema = Joi.string().uuid().required()
export const crumbSchema = Joi.string().optional().allow('')
export const confirmSchema = Joi.boolean().default(false)
