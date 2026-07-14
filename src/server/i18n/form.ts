import { type Translator } from '@defra/forms-engine-plugin/engine/i18n/types.js'
import { getAvailableLanguages } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import {
  type FormDefinition,
  type FormMetadata,
  type FormStatus
} from '@defra/forms-model'
import { type i18n } from 'i18next'
import { LRUCache } from 'lru-cache'

import {
  extractMetadataBaseTranslations,
  extractTranslations,
  runnerI18n
} from '~/src/server/i18n/index.js'
import { getFormDefinitionWithFallback } from '~/src/server/services/helpers/formsServiceHelper.js'

const cache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 15 // 15 minutes
})

/**
 * Get translator for runner, for runner-specific boilerplate, plus current form name (synchronous method).
 * This is for routes served by the plugin. The translator is injected into the Nunjucks context.
 * @param {string} id - the id of the form
 * @param { string | undefined } title - the title of the form
 * @param {FormStatus} status - the form status to use when retrieving the definition
 * @param {string} language - the language to use for the translator
 */
export function getCachedFormTranslatorBasic(
  id: string,
  title: string | undefined,
  status: FormStatus,
  language: string
) {
  const key = `${id}-${status}-${language}-runner-base`

  if (cache.has(key)) {
    return cache.get(key) as unknown as Translator
  }

  const translator = createFormTranslator(
    { id, title: title ?? '' } as FormMetadata,
    undefined,
    language
  )

  cache.set(key, translator)

  return translator
}

/**
 * Get translator for runner, for the current form's metadata (as well as the runner-specific boilerplate).
 * This is for external routes such as save-and-exit or privacy/help (not for routes served by the plugin).
 * This is an async call so we can read the form definition inside this call.
 * @param {FormMetadata} metadata - the metadata of the form
 * @param {FormStatus} status - the form status to use when retrieving the definition
 * @param {string} language - the language to use for the translator
 */
export async function getCachedFormTranslatorExternalRoutes(
  metadata: FormMetadata,
  status: FormStatus,
  language: string
) {
  const key = `${metadata.id}-${status}-${language}-runner-meta`

  if (cache.has(key)) {
    return cache.get(key) as unknown as Translator
  }

  const definition = await getFormDefinitionWithFallback(metadata.id, status)

  const translator = createFormTranslator(metadata, definition, language)

  cache.set(key, translator)

  return translator
}

/**
 * Get translator for a form metadata.
 * @param {FormMetadata} metadata - the form metadata
 * @param { FormDefinition | undefined } definition - the form definition
 * @param {string} language - the language to use for the translator
 */
export function createFormTranslator(
  metadata: FormMetadata,
  definition: FormDefinition | undefined,
  language: string
) {
  const languages = getAvailableLanguages(
    definition ??
      ({ metadata: { translations: { cy: {} } } } as unknown as FormDefinition)
  )
  const translator = createTranslator(runnerI18n, languages, language)

  extractTranslations(definition, runnerI18n)
  extractMetadataBaseTranslations(metadata, runnerI18n)

  return translator
}

export function createTranslator(
  i18nInstance: i18n,
  languages: { name: string; code: string }[],
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
    language,
    languages
  } as unknown as Translator
}
