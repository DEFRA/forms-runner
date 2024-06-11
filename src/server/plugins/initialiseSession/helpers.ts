import { token } from '@hapi/jwt'
import joi from 'joi'
import { customAlphabet } from 'nanoid'

import config from '~/src/server/config.js'
import { type Field } from '~/src/server/schemas/types.js'

export function fieldToValue(field: Field) {
  const { key, answer } = field
  return { [key]: answer }
}

export function generateSessionTokenForForm(callback, formId) {
  return token.generate(
    {
      cb: callback,
      user: customAlphabet(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123467890',
        16
      ),
      group: formId
    },
    {
      key: config.initialisedSessionKey,
      algorithm: config.initialisedSessionAlgorithm
    },
    {
      ttlSec: config.initialisedSessionTimeout / 1000
    }
  )
}

export function verifyToken(decodedToken) {
  try {
    token.verify(decodedToken, {
      key: config.initialisedSessionKey,
      algorithm: config.initialisedSessionAlgorithm
    })
    return { isValid: true }
  } catch (err) {
    return {
      isValid: false,
      error: `${err}`
    }
  }
}

export const callbackValidation = (safelist = config.safelist) =>
  joi.string().custom((value, helpers) => {
    const hostname = new URL(value).hostname
    if (!hostname) {
      return helpers.error('string.empty')
    }

    if (safelist.includes(hostname)) {
      return value
    }

    return helpers.error('string.hostname')
  })
