import { type Translator } from '@defra/forms-engine-plugin/engine/i18n/types.js'
import {
  type FormDefinition,
  type FormMetadata,
  type FormStatus
} from '@defra/forms-model'
import { type i18n } from 'i18next'
import { LRUCache } from 'lru-cache'

import {
  extractMetadataBaseTranslations,
  extractMetadataTranslations,
  runnerI18n
} from '~/src/server/i18n/index.js'

const cache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 15 // 15 minutes
})

/**
 * Get translator for a form definition, given the form metadata, status and language.
 * @param {FormMetadata} metadata - the form metadata
 * @param {FormDefinition} definition - the form definition
 * @param {FormStatus} status - the form status to use when retrieving the definition
 * @param {string} language - the language to use for the translator
 */
export function getCachedFormTranslator(
  metadata: FormMetadata,
  definition: FormDefinition,
  status: FormStatus,
  language: string
) {
  const key = `${metadata.id}-${status}-${language}`

  if (cache.has(key)) {
    return cache.get(key) as unknown as Translator
  }

  const translator = createFormTranslator(
    metadata,
    definition,
    status,
    language
  )

  cache.set(key, translator)

  return translator
}

/**
 * Get translator for a form definition, given the form metadata, status and language.
 * @param {FormMetadata} metadata - the form metadata
 * @param {FormStatus} status - the form status to use when retrieving the definition
 * @param {string} language - the language to use for the translator
 */
export function hasCachedFormTranslator(
  metadata: FormMetadata,
  status: FormStatus,
  language: string
) {
  const key = `${metadata.id}-${status}-${language}`

  return cache.has(key)
}

/**
 * Get translator for a form metadata.
 * @param {FormMetadata} metadata - the form metadata
 * @param {FormDefinition} definition - the form definition
 * @param {FormStatus} status - the form status to use when retrieving the definition
 * @param {string} language - the language to use for the translator
 */
export function createFormTranslator(
  metadata: FormMetadata,
  definition: FormDefinition,
  status: FormStatus,
  language: string
) {
  const translator = createTranslator(runnerI18n, language)

  extractMetadataTranslations(definition, runnerI18n)
  extractMetadataBaseTranslations(metadata, runnerI18n)

  return translator
}

export function createTranslator(
  i18nInstance: i18n,
  language = 'en-GB'
): Translator {
  const t = (key: string, opts?: Record<string, unknown>): string =>
    i18nInstance.t(key, { lng: language, ...opts })

  const resolveFormContent = (prop: string) => {
    const key = `form.${prop}`
    return i18nInstance.t(key, { ns: 'form', lng: language })
  }

  return {
    t,
    tForm: (prop: string) => resolveFormContent(prop),
    language
  } as unknown as Translator
}
