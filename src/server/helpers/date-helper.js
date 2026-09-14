/** Shows UTC timestamps in UK time, whatever zone the server runs in */
const TIME_ZONE = 'Europe/London'

/**
 * Formats an ISO timestamp with date and time in the page language, for
 * example `10 September 2026 at 14:00` or `10 Medi 2026 am 14:00`. The locale
 * supplies the month name and the word that joins the date to the time.
 * @param {string} timestamp - an ISO timestamp
 * @param {string} language - the page language, for example `en-GB` or `cy`
 * @returns {string}
 */
export function formatDateTime(timestamp, language) {
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'long',
    timeStyle: 'short',
    hourCycle: 'h23',
    timeZone: TIME_ZONE
  }).format(new Date(timestamp))
}
