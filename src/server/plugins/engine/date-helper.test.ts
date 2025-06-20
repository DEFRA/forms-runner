import { startOfToday } from 'date-fns'

import { todayAsDateOnly } from '~/src/server/plugins/engine/date-helper.js'

describe('todayAsDateOnly()', () => {
  test('should return today with no time element', () => {
    expect(todayAsDateOnly()).toEqual(startOfToday())
  })
})
