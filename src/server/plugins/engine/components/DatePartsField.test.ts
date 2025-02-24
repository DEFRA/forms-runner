import { ComponentType, type DatePartsFieldComponent } from '@defra/forms-model'
import { addDays, format, startOfDay } from 'date-fns'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers.js'
import { type DateInputItem } from '~/src/server/plugins/engine/components/types.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  type FormPayload,
  type FormState
} from '~/src/server/plugins/engine/types.js'
import definition from '~/test/form/definitions/blank.js'

describe('DatePartsField', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: DatePartsFieldComponent
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example date parts field',
        name: 'myComponent',
        type: ComponentType.DatePartsField,
        options: {}
      } satisfies DatePartsFieldComponent

      collection = new ComponentCollection([def], { model })
      field = collection.fields[0]
    })

    describe('Schema', () => {
      it('uses collection titles as labels', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent__day',
          expect.objectContaining({
            flags: expect.objectContaining({ label: 'Day' })
          })
        )

        expect(keys).toHaveProperty(
          'myComponent__month',
          expect.objectContaining({
            flags: expect.objectContaining({ label: 'Month' })
          })
        )

        expect(keys).toHaveProperty(
          'myComponent__year',
          expect.objectContaining({
            flags: expect.objectContaining({ label: 'Year' })
          })
        )
      })

      it('uses collection names as keys', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(field.keys).toEqual([
          'myComponent',
          'myComponent__day',
          'myComponent__month',
          'myComponent__year'
        ])

        expect(field.collection?.keys).not.toHaveProperty('myComponent')

        for (const key of field.collection?.keys ?? []) {
          expect(keys).toHaveProperty(key)
        }
      })

      it('is required by default', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent__day',
          expect.objectContaining({
            flags: expect.objectContaining({ presence: 'required' })
          })
        )

        expect(keys).toHaveProperty(
          'myComponent__month',
          expect.objectContaining({
            flags: expect.objectContaining({ presence: 'required' })
          })
        )

        expect(keys).toHaveProperty(
          'myComponent__year',
          expect.objectContaining({
            flags: expect.objectContaining({ presence: 'required' })
          })
        )
      })

      it('is optional when configured', () => {
        const collectionOptional = new ComponentCollection(
          [
            {
              title: 'Example date parts field',
              name: 'myComponent',
              type: ComponentType.DatePartsField,
              options: { required: false }
            }
          ],
          { model }
        )

        const { formSchema } = collectionOptional
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent__day',
          expect.objectContaining({ allow: [''] })
        )

        expect(keys).toHaveProperty(
          'myComponent__month',
          expect.objectContaining({ allow: [''] })
        )

        expect(keys).toHaveProperty(
          'myComponent__year',
          expect.objectContaining({ allow: [''] })
        )

        // Empty optional payload (valid)
        const result1 = collectionOptional.validate(
          getFormData({
            day: '',
            month: '',
            year: ''
          })
        )

        // Partial optional payload (invalid)
        const result2 = collectionOptional.validate(
          getFormData({
            day: '31',
            month: '',
            year: ''
          })
        )

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toEqual([
          expect.objectContaining({
            text: 'Example date parts field must include a month'
          })
        ])
      })

      it('accepts valid values', () => {
        const result1 = collection.validate(
          getFormData({
            day: '31',
            month: '12',
            year: '2024'
          })
        )

        const result2 = collection.validate(
          getFormData({
            day: '1',
            month: '2',
            year: '2024'
          })
        )

        // Leap year in 2024
        const result3 = collection.validate(
          getFormData({
            day: '29',
            month: '2',
            year: '2024'
          })
        )

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeUndefined()
        expect(result3.errors).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(
          getFormData({
            day: '',
            month: '',
            year: ''
          })
        )

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Example date parts field must include a day'
          }),
          expect.objectContaining({
            text: 'Example date parts field must include a month'
          }),
          expect.objectContaining({
            text: 'Example date parts field must include a year'
          })
        ])
      })

      it('adds errors for invalid values', () => {
        const result1 = collection.validate(getFormData({ unknown: 'invalid' }))

        const result2 = collection.validate(
          getFormData({
            day: ['invalid'],
            month: ['invalid'],
            year: ['invalid']
          })
        )

        const result3 = collection.validate(
          getFormData({
            day: 'invalid',
            month: 'invalid',
            year: 'invalid'
          })
        )

        expect(result1.errors).toBeTruthy()
        expect(result2.errors).toBeTruthy()
        expect(result3.errors).toBeTruthy()
      })
    })

    describe('State', () => {
      const date = new Date('2024-12-31')

      it('returns text from state', () => {
        const state1 = getFormState(date)
        const state2 = getFormState({})

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe('31 December 2024')
        expect(answer2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState(startOfDay(date))
        const state2 = getFormState({})

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData(date))
        expect(payload2).toEqual(getFormData({}))
      })

      it('returns value from state', () => {
        const state1 = getFormState(startOfDay(date))
        const state2 = getFormState({})

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toEqual({
          day: 31,
          month: 12,
          year: 2024
        })

        expect(value2).toBeUndefined()
      })

      it('returns context for conditions and form submission', () => {
        const state1 = getFormState(startOfDay(date))
        const state2 = getFormState({})

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)

        expect(value1).toBe('2024-12-31')
        expect(value2).toBeNull()
      })

      it('returns null context when date is invalid', () => {
        const state1 = getFormState({ day: 1, month: 0, year: 2025 })
        const state2 = getFormState({})
        const state3 = getFormState({ day: 1, month: 13, year: 2025 })
        const state4 = getFormState({ day: 32, month: 12, year: 2025 })

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)
        const value3 = field.getContextValueFromState(state3)
        const value4 = field.getContextValueFromState(state4)

        expect(value1).toBeNull()
        expect(value2).toBeNull()
        expect(value3).toBeNull()
        expect(value4).toBeNull()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData(date)
        const payload2 = getFormData({})

        const value1 = field.getStateFromValidForm(payload1)
        const value2 = field.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState(date))
        expect(value2).toEqual(getFormState({}))
      })
    })

    describe('View model', () => {
      const date = new Date('2024-12-31')

      it('sets Nunjucks component defaults', () => {
        const payload = getFormData(date)
        const viewModel = field.getViewModel(payload)

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: undefined,
            items: [
              expect.objectContaining(
                getViewModel(date, 'day', {
                  label: { text: 'Day' },
                  classes: 'govuk-input--width-2',
                  value: 31
                })
              ),

              expect.objectContaining(
                getViewModel(date, 'month', {
                  label: { text: 'Month' },
                  classes: 'govuk-input--width-2',
                  value: 12
                })
              ),

              expect.objectContaining(
                getViewModel(date, 'year', {
                  label: { text: 'Year' },
                  classes: 'govuk-input--width-4',
                  value: 2024
                })
              )
            ]
          })
        )
      })

      it('sets Nunjucks component value when invalid', () => {
        const payload = getFormData({
          day: 'DD',
          month: 'MM',
          year: 'YYYY'
        })

        const viewModel = field.getViewModel(payload)

        expect(viewModel).toEqual(
          expect.objectContaining({
            items: [
              expect.objectContaining(
                getViewModel(date, 'day', { value: 'DD' })
              ),

              expect.objectContaining(
                getViewModel(date, 'month', { value: 'MM' })
              ),

              expect.objectContaining(
                getViewModel(date, 'year', { value: 'YYYY' })
              )
            ]
          })
        )
      })

      it('sets Nunjucks component fieldset', () => {
        const payload = getFormData(date)
        const viewModel = field.getViewModel(payload)

        expect(viewModel.fieldset).toEqual({
          legend: {
            text: def.title,
            classes: 'govuk-fieldset__legend--m'
          }
        })
      })
    })
  })

  describe('Validation', () => {
    const today = startOfDay(new Date())
    const date = new Date('2001-01-01')

    const OneDayInPast = addDays(today, -1)
    const TwoDaysInPast = addDays(today, -2)
    const OneDayInFuture = addDays(today, 1)
    const TwoDaysInFuture = addDays(today, 2)

    describe.each([
      {
        description: 'Trim empty spaces',
        component: {
          title: 'Example date parts field',
          name: 'myComponent',
          type: ComponentType.DatePartsField,
          options: {}
        } satisfies DatePartsFieldComponent,
        assertions: [
          {
            input: getFormData({
              day: ' 01',
              month: ' 01',
              year: ' 2001'
            }),
            output: {
              value: getFormData(date)
            }
          },
          {
            input: getFormData({
              day: '01 ',
              month: '01 ',
              year: '2001 '
            }),
            output: {
              value: getFormData(date)
            }
          },
          {
            input: getFormData({
              day: ' 01 \n\n',
              month: ' 01 \n\n',
              year: ' 2001 \n\n'
            }),
            output: {
              value: getFormData(date)
            }
          }
        ]
      },
      {
        description: 'Decimals',
        component: {
          title: 'Example date parts field',
          name: 'myComponent',
          type: ComponentType.DatePartsField,
          options: {}
        } satisfies DatePartsFieldComponent,
        assertions: [
          {
            input: getFormData({
              day: '1.1',
              month: '1.2',
              year: '2001.3'
            }),
            output: {
              value: getFormData({
                day: 1.1,
                month: 1.2,
                year: 2001.3
              }),
              errors: [
                expect.objectContaining({
                  text: 'Example date parts field must be a real date'
                }),
                expect.objectContaining({
                  text: 'Example date parts field must be a real date'
                }),
                expect.objectContaining({
                  text: 'Example date parts field must be a real date'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Leap years',
        component: {
          title: 'Example date parts field',
          name: 'myComponent',
          type: ComponentType.DatePartsField,
          options: {}
        } satisfies DatePartsFieldComponent,
        assertions: [
          {
            // Leap year in 2024
            input: getFormData({
              day: '29',
              month: '2',
              year: '2024'
            }),
            output: {
              value: getFormData({
                day: 29,
                month: 2,
                year: 2024
              })
            }
          },
          {
            // Not a leap year in 2023
            input: getFormData({
              day: '29',
              month: '2',
              year: '2023'
            }),
            output: {
              value: getFormData({
                day: 29,
                month: 2,
                year: 2023
              }),
              errors: [
                expect.objectContaining({
                  text: 'Example date parts field must be a real date'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Out of range values',
        component: {
          title: 'Example date parts field',
          name: 'myComponent',
          type: ComponentType.DatePartsField,
          options: {}
        } satisfies DatePartsFieldComponent,
        assertions: [
          {
            input: getFormData({
              day: '32',
              month: '1',
              year: '2024'
            }),
            output: {
              value: getFormData({
                day: 32,
                month: 1,
                year: 2024
              }),
              errors: [
                expect.objectContaining({
                  text: 'Example date parts field must be a real date'
                })
              ]
            }
          },
          {
            input: getFormData({
              day: '1',
              month: '13',
              year: '2024'
            }),
            output: {
              value: getFormData({
                day: 1,
                month: 13,
                year: 2024
              }),
              errors: [
                expect.objectContaining({
                  text: 'Example date parts field must be a real date'
                })
              ]
            }
          },
          {
            input: getFormData({
              day: '1',
              month: '1',
              year: '999'
            }),
            output: {
              value: getFormData({
                day: 1,
                month: 1,
                year: 999
              }),
              errors: [
                expect.objectContaining({
                  text: 'Example date parts field must be a real date'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Impossible dates',
        component: {
          title: 'Example date parts field',
          name: 'myComponent',
          type: ComponentType.DatePartsField,
          options: {}
        } satisfies DatePartsFieldComponent,
        assertions: [
          {
            input: getFormData({
              day: '31',
              month: '4',
              year: '2024'
            }),
            output: {
              value: getFormData({
                day: 31,
                month: 4,
                year: 2024
              }),
              errors: [
                expect.objectContaining({
                  text: 'Example date parts field must be a real date'
                })
              ]
            }
          },
          {
            input: getFormData({
              day: '31',
              month: '6',
              year: '2024'
            }),
            output: {
              value: getFormData({
                day: 31,
                month: 6,
                year: 2024
              }),
              errors: [
                expect.objectContaining({
                  text: 'Example date parts field must be a real date'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Max days in the past option',
        component: {
          title: 'Example date parts field',
          name: 'myComponent',
          type: ComponentType.DatePartsField,
          options: {
            maxDaysInPast: 1
          }
        } satisfies DatePartsFieldComponent,
        assertions: [
          {
            input: getFormData(TwoDaysInPast),
            output: {
              value: getFormData(TwoDaysInPast),
              errors: [
                expect.objectContaining({
                  text: `Example date parts field must be the same as or after ${format(OneDayInPast, 'd MMMM yyyy')}`
                })
              ]
            }
          },
          {
            input: getFormData(today),
            output: { value: getFormData(today) }
          }
        ]
      },
      {
        description: 'Max days in the future option',
        component: {
          title: 'Example date parts field',
          name: 'myComponent',
          type: ComponentType.DatePartsField,
          options: {
            maxDaysInFuture: 1
          }
        } satisfies DatePartsFieldComponent,
        assertions: [
          {
            input: getFormData(TwoDaysInFuture),
            output: {
              value: getFormData(TwoDaysInFuture),
              errors: [
                expect.objectContaining({
                  text: `Example date parts field must be the same as or before ${format(OneDayInFuture, 'd MMMM yyyy')}`
                })
              ]
            }
          },
          {
            input: getFormData(today),
            output: { value: getFormData(today) }
          }
        ]
      },
      {
        description: 'Optional fields',
        component: {
          title: 'Example date parts field',
          name: 'myComponent',
          type: ComponentType.DatePartsField,
          options: {
            required: false
          }
        } satisfies DatePartsFieldComponent,
        assertions: [
          {
            input: getFormData({
              day: '',
              month: '',
              year: ''
            }),
            output: {
              value: getFormData({
                day: '',
                month: '',
                year: ''
              })
            }
          }
        ]
      }
    ])('$description', ({ component: def, assertions }) => {
      let collection: ComponentCollection

      beforeEach(() => {
        collection = new ComponentCollection([def], { model })
      })

      it.each([...assertions])(
        'validates custom example',
        ({ input, output }) => {
          const result = collection.validate(input)
          expect(result).toEqual(output)
        }
      )
    })
  })
})

/**
 * Date field view model
 */
function getViewModel(
  date: Date,
  name: string,
  overrides?: Partial<DateInputItem>
): DateInputItem {
  const payload = getFormData(date)

  const fieldName = `myComponent__${name}`
  const fieldValue = overrides?.value ?? payload[fieldName]
  const fieldClasses = overrides?.classes ?? expect.any(String)

  return {
    label: expect.objectContaining(
      overrides?.label ?? {
        text: expect.any(String)
      }
    ),
    name: fieldName,
    id: fieldName,
    value: fieldValue as DateInputItem['value'],
    classes: fieldClasses
  }
}

/**
 * Date form data
 */
function getFormData(date: Date | FormPayload): FormPayload {
  if (date instanceof Date) {
    date = {
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear()
    }
  }

  return {
    myComponent__day: date.day,
    myComponent__month: date.month,
    myComponent__year: date.year
  }
}

/**
 * Date session state
 */
function getFormState(date: Date | FormPayload): FormState {
  const [day, month, year] = Object.values(getFormData(date))

  return {
    myComponent__day: day ?? null,
    myComponent__month: month ?? null,
    myComponent__year: year ?? null
  }
}
