import { createFormTranslator } from '@defra/forms-engine-plugin/engine/i18n/createFormTranslator.js'
import { type Translator } from '@defra/forms-engine-plugin/engine/i18n/types.js'
import { type FormStatus } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { LRUCache } from 'lru-cache'

import { getFormDefinition } from '~/src/server/services/formsService.js'

const cache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 15 // 15 minutes
})

/**
 * Get translator for a form definition, given the form id, status and language.
 * @param {string} id - the form id to retrieve the definition for
 * @param {FormStatus} status - the form status to use when retrieving the definition
 * @param {string} language - the language to use for the translator
 */
export async function getCachedFormTranslator(
  id: string,
  status: FormStatus,
  language: string
) {
  const key = `${id}-${status}-${language}`

  if (cache.has(key)) {
    return cache.get(key) as unknown as Translator
  }

  const translator = await getFormTranslator(id, status, language)

  cache.set(key, translator)

  return translator
}

/**
 * Get translator for a form definition, given the form id, status and language.
 * @param {string} id - the form id to retrieve the definition for
 * @param {FormStatus} status - the form status to use when retrieving the definition
 * @param {string} language - the language to use for the translator
 */
export async function getFormTranslator(
  id: string,
  status: FormStatus,
  language: string
) {
  const def = await getFormDefinition(id, status)

  if (!def) {
    throw Boom.notFound(
      `No definition found for form metadata ${id} (${status})`
    )
  }

  const translator = createFormTranslator(def, language)

  return translator
}
