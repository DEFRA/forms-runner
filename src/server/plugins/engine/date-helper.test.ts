import { startOfToday } from 'date-fns'

import {
  parseStrictDate,
  todayAsDateOnly
} from '~/src/server/plugins/engine/date-helper.js'

describe('todayAsDateOnly()', () => {
  test('should return today with no time element', () => {
    expect(todayAsDateOnly()).toEqual(startOfToday())
  })
})

describe('parseStrictDate()', () => {
  test('should parse valid date', () => {
    const dateObj = {
      year: 2025,
      month: 5,
      day: 21
    }
    expect(
      parseStrictDate(dateObj, '2025-05-21', 'yyyy-MM-dd', new Date())
    ).toEqual(new Date(2025, 4, 21))
  })

  test('should fail to parse invalid date with 4-digit year', () => {
    const dateObj = {
      year: 2025,
      month: 15,
      day: 21
    }
    expect(
      parseStrictDate(dateObj, '2025-15-21', 'yyyy-MM-dd', new Date())
    ).toBeNaN()
  })

  test('should fail to parse valid date that has non-4-digit year', () => {
    const dateObj = {
      year: 25,
      month: 5,
      day: 21
    }
    expect(
      parseStrictDate(dateObj, '25-15-21', 'yyyy-MM-dd', new Date())
    ).toBeNaN()
  })
})
