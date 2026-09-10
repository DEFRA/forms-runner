/**
 * The zone the dates are read in. A timestamp is stored in UTC, so the day it
 * falls on depends on where it is read: half past eleven at night in UTC is
 * already the next day in British Summer Time. Naming the zone keeps every
 * server showing a citizen the same day.
 */
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
 * A date and time as GOV.UK writes them, for example
 * `10 September 2026 at 14:00`.
 * @param {string | Date} value - an ISO timestamp, or a date
 * @returns {string}
 */
export function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)

  return `${dayMonthYear.format(date)} at ${hourMinute.format(date)}`
}
