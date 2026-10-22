import Joi from 'joi'

import { localReturnPath } from '~/src/server/utils/utils.js'

/**
 * Where a route sends the user when it has finished with them.
 *
 * The value is resolved during validation, so a handler reads the path it
 * will redirect to. A value outside this service fails validation and the
 * request answers 400. Add `.required()` or `.optional()` at the route.
 */
export const returnUrlSchema = Joi.string()
  .custom(
    (value, helpers) => localReturnPath(value) ?? helpers.error('any.invalid')
  )
  .messages({
    'any.invalid': '"returnUrl" must be a path within this service'
  })
