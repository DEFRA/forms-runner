import { DateField } from '../../../../../src/server/plugins/engine/components/DateField.js'
import { messages } from '../../../../../src/server/plugins/engine/pageControllers/validationOptions.js'

describe('Date field', () => {
  const baseDef = {
    name: 'myComponent',
    title: 'My component',
    options: { required: true },
    schema: {},
    type: 'DateField'
  }

  test('Error is displayed for invalid date', () => {
    const dateField = new DateField(baseDef)
    const { schema } = dateField

    expect(schema.validate('', { messages }).error.message).toContain(
      'must be a real date'
    )
    expect(schema.validate('not-a-date', { messages }).error.message).toContain(
      'must be a real date'
    )

    expect(schema.validate('30-30-3000', { messages }).error.message).toContain(
      'must be a real date'
    )

    expect(schema.validate('4000-40-40', { messages }).error.message).toContain(
      'must be a real date'
    )

    expect(schema.validate('2021-12-25', { messages }).error).toBeUndefined()
  })

  test('Error is displayed correctly when maxDaysInFuture configured', () => {
    const def = {
      ...baseDef,
      options: { maxDaysInFuture: 5 }
    }
    const dateField = new DateField(def)
    const { schema } = dateField
    let date = new Date()
    date = new Date(date.setMonth(date.getMonth() + 5))

    expect(
      schema.validate(date.toISOString(), { messages }).error.message
    ).toContain('must be the same as or before')

    expect(
      schema.validate(new Date().toISOString(), { messages }).error
    ).toBeUndefined()
  })

  test('Error is displayed correctly when maxDaysInPast configured', () => {
    const def = {
      ...baseDef,
      options: { maxDaysInPast: 5 }
    }
    const dateField = new DateField(def)
    const { schema } = dateField
    let date = new Date()
    date = new Date(date.setMonth(date.getMonth() - 5))

    expect(
      schema.validate(date.toISOString(), { messages }).error.message
    ).toContain('must be the same as or after')

    expect(
      schema.validate(new Date().toISOString(), { messages }).error
    ).toBeUndefined()
  })
})
