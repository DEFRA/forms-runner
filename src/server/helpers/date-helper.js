/** Shows UTC timestamps in UK time, whatever zone the server runs in */
const TIME_ZONE = 'Europe/London'

/**
 * Formats an ISO timestamp with date and time in the page language, for
 * example `10 September 2026 at 5:30pm` or `10 Medi 2026 am 5:30yh`. The
 * locale supplies the month name and the word that joins the date to the
 * time. The translator supplies am and pm, because the locale data writes
 * these in English for a Welsh page.
 * @param {string} timestamp - an ISO timestamp
 * @param {Translator} translator - the translator for the request
 * @returns {string}
 */
export function formatDateTime(timestamp, translator) {
  const parts = new Intl.DateTimeFormat(translator.language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: TIME_ZONE
  }).formatToParts(new Date(timestamp))

  return parts
    .map((part, index) => {
      if (part.type === 'dayPeriod') {
        return translator.t(`dateTime.${part.value.toLowerCase()}`)
      }

      // Joins the time to am or pm with no space, for example `5:30pm`
      if (parts[index + 1]?.type === 'dayPeriod') {
        return part.value.trimEnd()
      }

      return part.value
    })
    .join('')
}

/**
 * @import { Translator } from '@defra/forms-engine-plugin/types'
 */
