import { type FormDefinitionTranslations } from '@defra/forms-engine-plugin/engine/i18n/types.js'
import { getErrorMessage, type FormDefinition } from '@defra/forms-model'
import i18next, { createInstance, type i18n } from 'i18next'

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import cy from '~/src/server/i18n/translations/cy.json' with { type: 'json' }
import enGB from '~/src/server/i18n/translations/en-GB.json' with { type: 'json' }

export const runnerI18n = i18next.createInstance()

runnerI18n
  .init({
    resources: {
      'en-GB': { runner: enGB },
      cy: { runner: cy }
    },
    fallbackLng: 'en-GB',
    ns: ['runner', 'form'],
    defaultNS: 'runner',
    returnObjects: true,
    interpolation: {
      prefix: '[[',
      suffix: ']]',
      escapeValue: false
    }
  })
  .catch((err: unknown) => {
    // init with inline resources completes synchronously — unreachable
    logger.error(`Fatal init for translator instance: ${getErrorMessage(err)}`)
  })

/**
 * Creates an instance of i18next with base (boilerplate) translation files loaded (en-GB.json and cy.json),
 * and appropriate namespaces for loading of form-specific translations later
 */
export function createFormI18nInstance() {
  const instance = createInstance()

  instance
    .init({
      resources: {
        'en-GB': {
          runner: enGB
        },
        cy: {
          runner: cy
        }
      },
      fallbackLng: 'en-GB',
      ns: ['runner', 'form'],
      defaultNS: 'runner',
      interpolation: {
        prefix: '[[',
        suffix: ']]',
        escapeValue: false
      }
    })
    .catch((err: unknown) => {
      // init with inline resources completes synchronously — unreachable
      logger.error(
        `Fatal init for translator instance: ${getErrorMessage(err)}`
      )
    })

  return instance
}

export function extractTranslations(
  def: FormDefinition | undefined,
  i18nInstance: i18n
) {
  if (!def) {
    return
  }
  const formTranslations = def.metadata?.translations as
    FormDefinitionTranslations | undefined

  if (formTranslations) {
    for (const [lng, resources] of Object.entries(formTranslations)) {
      i18nInstance.addResourceBundle(lng, 'form', resources, true, true)
    }
  }
}

export function t(
  key: string,
  lang: string,
  opts?: Record<string, unknown>
): string | string[] {
  return runnerI18n.t(key, { lng: lang, ...opts })
}

export function tForm(
  key: string,
  lang: string,
  opts?: Record<string, unknown>
): string | string[] {
  return runnerI18n.t(`form.${key}`, { lng: lang, ns: 'form', ...opts })
}
