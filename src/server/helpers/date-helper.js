/** Shows UTC timestamps in UK time, whatever zone the server runs in */
const TIME_ZONE = 'Europe/London'

const dayMonthYear = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE
})

const hourMinute = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TIME_ZONE
})

/**
 * Formats an ISO timestamp with date and time, for example
 * `10 September 2026 at 14:00`
 * @param {string} timestamp - an ISO timestamp
 * @returns {string}
 */
export function formatDateTime(timestamp) {
  const date = new Date(timestamp)

  return `${dayMonthYear.format(date)} at ${hourMinute.format(date)}`
}
