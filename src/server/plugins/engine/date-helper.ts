import { startOfToday } from 'date-fns'

/**
 * This function is just a wrapper for startOfToday() but, since it's in a separate file, allows
 * the function to be easily mocked for unit testing.
 * @returns {Date}
 */
export function todayAsDateOnly() {
  return startOfToday()
}
