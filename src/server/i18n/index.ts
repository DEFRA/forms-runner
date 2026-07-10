import { type FormDefinitionTranslations } from '@defra/forms-engine-plugin/engine/i18n/types.js'
import {
  getErrorMessage,
  type FormDefinition,
  type FormMetadata
} from '@defra/forms-model'
import i18next, { type i18n } from 'i18next'

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

export function extractMetadataBaseTranslations(
  metadata: FormMetadata | undefined,
  i18nInstance: i18n
) {
  if (metadata) {
    const translations = {
      'form.title': metadata.title,
      'contact.email.address': metadata.contact?.email?.address ?? '',
      'contact.email.responseTime': metadata.contact?.email?.responseTime ?? '',
      'contact.online.url': metadata.contact?.online?.url ?? '',
      'contact.online.text': metadata.contact?.online?.url ?? '',
      'contact.phone': metadata.contact?.phone ?? '',
      submissionGuidance: metadata.submissionGuidance ?? '',
      privacyNoticeText: metadata.privacyNoticeText ?? '',
      privacyNoticeUrl: metadata.privacyNoticeUrl ?? ''
    }
    i18nInstance.addResourceBundle('en-GB', 'form', translations, true, true)
  }
}

export function extractMetadataTranslations(
  def: FormDefinition,
  i18nInstance: i18n
) {
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
