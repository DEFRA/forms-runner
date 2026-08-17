import Joi from 'joi'

import { localReturnPath } from '~/src/server/auth/accountSession.js'

/**
 * Where sign in returns the citizen once the provider has answered.
 *
 * It resolves as it validates, so a route reads a value that is already the
 * path it will redirect to, and a target this service cannot reach is
 * refused before the round trip starts — which is a sign in the citizen
 * keeps.
 */
export const returnToSchema = Joi.string()
  .required()
  .custom(
    (value, helpers) => localReturnPath(value) ?? helpers.error('any.invalid')
  )
  .messages({
    'any.invalid': '"returnTo" must be a path within this service'
  })
