import i18next from 'i18next'

import cy from '~/src/server/i18n/translations/cy.json' with { type: 'json' }
import enGB from '~/src/server/i18n/translations/en-GB.json' with { type: 'json' }
import xPirate from '~/src/server/i18n/translations/x-pirate.json' with { type: 'json' }

const runnerI18n = i18next.createInstance()

runnerI18n
  .init({
    resources: {
      'en-GB': { translation: enGB },
      'x-pirate': { translation: xPirate },
      cy: { translation: cy }
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
): string | string[] {
  return runnerI18n.t(key, { lng: lang, ...opts }) as string | string[]
}
