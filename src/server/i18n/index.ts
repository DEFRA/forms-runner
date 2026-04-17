import  { type FormMetadata } from '@defra/forms-model'
import i18next from 'i18next'


import enGB from '~/src/server/i18n/translations/en-GB.json' with { type: 'json' }

const runnerI18n = i18next.createInstance()

runnerI18n
  .init({
    resources: {
      'en-GB': { translation: enGB }
    },
    fallbackLng: 'en-GB',
    returnObjects: true,
    interpolation: {
      prefix: '[[',
      suffix: ']]',
      escapeValue: false
    }
  })
  .catch(() => {
    // init with inline resources completes synchronously — unreachable
  })

export function t(
  key: string,
  lang: string,
  opts?: Record<string, unknown>
): string {
  return runnerI18n.t(key, { lng: lang, ...opts })
}

export function resolveLanguage(metadata?: FormMetadata): string {
  // @ts-expect-error -- language not yet on FormMetadata type
   
  const lang = metadata?.language as string | undefined
  return lang ?? 'en-GB'
}
