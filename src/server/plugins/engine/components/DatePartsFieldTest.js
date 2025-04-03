import { format, isValid, parse } from 'date-fns'

/**
 * @param {import('./DatePartsField.js').DatePartsState | undefined} value
 */
function test(value) {
  if (!value ||
    !isValid(
      parse(`${value.year}-${value.month}-${value.day}`, 'yyyy-MM-dd', new Date())
    )) {
    console.log(null)

  } else {
    console.log(format(`${value.year}-${value.month}-${value.day}`, 'yyyy-MM-dd'))
  }
}

test({
  year: 2000,
  month: 12,
  day: 1
})

test({
  year: 12,
  month: 122,
  day: 122
})

test({})
test(null)
test(undefined)
test(true)
test(false)
test(0)
test(2)
test('')

test('2001-01-01')

test('asdas')
test(/'2001-01-01'/)

test({
  year: -2000,
  month: -12,
  day: -1
})

test({
  year: 0,
  month: 0,
  day: 0
})

test({
  year: undefined,
  month: undefined,
  day: undefined
})

test({
  year: null,
  month: null,
  day: null
})

test({
  foo: null,
  baz: null,
  bar: null
})

test({
  foo: 1,
  baz: 1,
  bar: 1
})

test({
  year: 2000000000000,
  month: 120000000000000,
  day: 1000000000000
})

test({
  year: '2001',
  month: '12',
  day: '1'
})

test({
  year: 'yyyy',
  month: 'MM',
  day: 'dd'
})

test({
  year: false,
  month: false,
  day: false
})

test({
  year: -0,
  month: -0,
  day: -0
})

test({
  year: -10,
  month: 10,
  day: -10
})

test({
  year: 2013,
  month: 2,
  day: 28
})

test({
  year: 2014,
  month: 2,
  day: 29
})

test({
  year: 2015,
  month: 2,
  day: 29
})

test({
  year: 2016,
  month: 2,
  day: 29
})
