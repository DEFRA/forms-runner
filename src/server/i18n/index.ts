import  { type FormMetadata } from '@defra/forms-model'

import enGB from '~/src/server/i18n/translations/en-GB.json' with { type: 'json' }

const translations: Record<string, Record<string, unknown>> = {
  'en-GB': enGB as Record<string, unknown>
}

/**
 * Resolve a dot-notation key against a nested object, returning a string or
 * undefined when the key does not exist.
 */
function lookup(obj: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

/**
 * Interpolate `[[key]]` placeholders in a template string using the supplied
 * values object.
 */
function interpolate(template: string, opts?: Record<string, unknown>): string {
  if (!opts) {
    return template
  }
  return template.replace(/\[\[(\w+)\]\]/g, (_, key: string) => {
    const value = opts[key]
    return value !== undefined
      ? String(value as string | number | boolean)
      : `[[${key}]]`
  })
}

/**
 * Translate a dot-notation key for the given language, falling back to en-GB.
 * Values in `opts` are interpolated into `[[key]]` placeholders.
 */
export function t(
  key: string,
  lang: string,
  opts?: Record<string, unknown>
): string {
  const dict = translations[lang] ?? translations['en-GB']
  const fallback = translations['en-GB']

  const raw = lookup(dict, key) ?? lookup(fallback, key) ?? key
  return interpolate(raw, opts)
}

/**
 * Resolve the language from form metadata, defaulting to en-GB.
 */
export function resolveLanguage(metadata?: FormMetadata): string {
  // @ts-expect-error -- language not yet on FormMetadata type
   
  const lang = metadata?.language as string | undefined
  return lang ?? 'en-GB'
}
