import { CY, EN_GB } from '~/src/server/constants.js'
import { formatDateTime } from '~/src/server/helpers/date-helper.js'
import { createFormTranslator } from '~/src/server/i18n/form.js'

const form = /** @type {FormMetadata} */ ({ id: 'form-id', slug: 'my-form' })
const english = createFormTranslator(form, undefined, EN_GB)
const welsh = createFormTranslator(form, undefined, CY)

describe('formatDateTime', () => {
  it('writes a date and time the way GOV.UK does', () => {
    expect(formatDateTime('2026-09-10T16:30:00.000Z', english)).toBe(
      '10 September 2026 at 5:30pm'
    )
  })

  it('writes the month, the joining word and pm in Welsh for a Welsh page', () => {
    expect(formatDateTime('2026-09-10T16:30:00.000Z', welsh)).toBe(
      '10 Medi 2026 am 5:30yh'
    )
  })

  it('writes am in Welsh for a Welsh page', () => {
    expect(formatDateTime('2026-01-15T09:05:00.000Z', welsh)).toBe(
      '15 Ionawr 2026 am 9:05yb'
    )
  })

  it('uses the 12 hour clock, with 12 in the afternoon as pm and 12 in the morning as am', () => {
    expect(formatDateTime('2026-01-15T12:15:00.000Z', english)).toBe(
      '15 January 2026 at 12:15pm'
    )
    expect(formatDateTime('2026-01-15T00:15:00.000Z', english)).toBe(
      '15 January 2026 at 12:15am'
    )
  })

  it('reads the day and time in UK time, not the time zone the server happens to run in', () => {
    // Late evening UTC is already the next day in British Summer Time. A
    // server in UTC and a server in London must still agree.
    expect(formatDateTime('2026-10-05T23:30:00.000Z', english)).toBe(
      '6 October 2026 at 12:30am'
    )
  })
})

/**
 * @import { FormMetadata } from '@defra/forms-model'
 */
