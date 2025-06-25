import { parse, startOfToday } from 'date-fns'

import {
  type DatePartsState,
  type MonthYearState
} from '~/src/server/plugins/engine/components/types.js'

/**
 * This function is just a wrapper for startOfToday() but, since it's in a separate file, allows
 * the function to be easily mocked for unit testing.
 * @returns {Date}
 */
export function todayAsDateOnly() {
  return startOfToday()
}

/**
 * Wrapper for date-fns parse() method to ensure the year is 4-digits. It seems parse() allows a non-4-digit year
 * despite the format mask enforcing it.
 */
export function parseStrictDate(
  dateObj: DatePartsState | MonthYearState,
  dateStr: string,
  formatStr: string,
  referenceDate: Date
) {
  if (!dateObj.year || dateObj.year < 1000 || dateObj.year > 9999) {
    return NaN
  }

  return parse(dateStr, formatStr, referenceDate)
}
