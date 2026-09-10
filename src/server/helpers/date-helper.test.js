import { formatDateTime } from '~/src/server/helpers/date-helper.js'

describe('formatDateTime', () => {
  it('writes a date and time the way GOV.UK does', () => {
    expect(formatDateTime('2026-09-10T13:00:00.000Z')).toBe(
      '10 September 2026 at 14:00'
    )
  })

  it('reads the day in UK time, not the time zone the server happens to run in', () => {
    // Late evening UTC is already the next day in British Summer Time. A
    // server in UTC and a server in London must still agree.
    expect(formatDateTime('2026-10-05T23:30:00.000Z')).toBe(
      '6 October 2026 at 00:30'
    )
  })

  it('keeps to the 24 hour clock, so there is no am or pm to misread', () => {
    expect(formatDateTime('2026-01-15T20:05:00.000Z')).toBe(
      '15 January 2026 at 20:05'
    )
  })

  it('accepts a date as well as the string an API sends', () => {
    expect(formatDateTime(new Date('2026-09-10T13:00:00.000Z'))).toBe(
      '10 September 2026 at 14:00'
    )
  })
})
