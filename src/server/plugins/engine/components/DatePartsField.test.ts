import {
  ComponentType,
  type DatePartsFieldComponent,
  type FormDefinition
} from '@defra/forms-model'
import { addDays, startOfDay } from 'date-fns'

import { DatePartsField } from '~/src/server/plugins/engine/components/DatePartsField.js'
import { type DateInputItem } from '~/src/server/plugins/engine/components/types.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type FormPayload,
  type FormState
} from '~/src/server/plugins/engine/types.js'

describe('DatePartsField', () => {
  const definition = {
    pages: [],
    lists: [],
    sections: [],
    conditions: []
  } satisfies FormDefinition

  let formModel: FormModel

  beforeEach(() => {
    formModel = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: DatePartsFieldComponent
    let component: DatePartsField

    beforeEach(() => {
      def = {
        title: 'Example date parts field',
        name: 'myComponent',
        type: ComponentType.DatePartsField,
        options: {}
      } satisfies DatePartsFieldComponent

      component = new DatePartsField(def, formModel)
    })

    describe('Schema', () => {
      it('uses collection titles as labels', () => {
        const { formSchema } = component

        expect(formSchema.describe().keys).toEqual(
          expect.objectContaining({
            myComponent__day: expect.objectContaining({
              flags: expect.objectContaining({ label: 'day' })
            }),
            myComponent__month: expect.objectContaining({
              flags: expect.objectContaining({ label: 'month' })
            }),
            myComponent__year: expect.objectContaining({
              flags: expect.objectContaining({ label: 'year' })
            })
          })
        )
      })

      it('is required by default', () => {
        const { formSchema } = component

        expect(formSchema.describe().flags).toEqual(
          expect.objectContaining({
            presence: 'required'
          })
        )
      })

      it('is optional when configured', () => {
        const componentOptional = new DatePartsField(
          {
            title: 'Example date parts field',
            name: 'myComponent',
            type: ComponentType.DatePartsField,
            options: { required: false }
          },
          formModel
        )

        const { formSchema } = componentOptional

        expect(formSchema.describe().keys).toEqual(
          expect.objectContaining({
            myComponent__day: expect.objectContaining({
              allow: ['']
            }),
            myComponent__month: expect.objectContaining({
              allow: ['']
            }),
            myComponent__year: expect.objectContaining({
              allow: ['']
            })
          })
        )

        const result = formSchema.validate(
          getFormData({
            day: '',
            month: '',
            year: ''
          }),
          opts
        )

        expect(result.error).toBeUndefined()
      })

      it('accepts valid values', () => {
        const { formSchema } = component

        const result1 = formSchema.validate(
          getFormData({
            day: '31',
            month: '12',
            year: '2024'
          }),
          opts
        )

        const result2 = formSchema.validate(
          getFormData({
            day: '1',
            month: '2',
            year: '2024'
          }),
          opts
        )

        // Leap year in 2024
        const result3 = formSchema.validate(
          getFormData({
            day: '29',
            month: '2',
            year: '2024'
          }),
          opts
        )

        expect(result1.error).toBeUndefined()
        expect(result2.error).toBeUndefined()
        expect(result3.error).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const { formSchema } = component

        const result = formSchema.validate(
          getFormData({
            day: '',
            month: '',
            year: ''
          }),
          opts
        )

        expect(result.error).toEqual(
          expect.objectContaining({
            message: [
              'Example date parts field must include a day',
              'Example date parts field must include a month',
              'Example date parts field must include a year'
            ].join('. ')
          })
        )
      })

      it('adds errors for invalid values', () => {
        const { formSchema } = component

        const result1 = formSchema.validate(['invalid'], opts)
        const result2 = formSchema.validate({ unknown: 'invalid' }, opts)
        const result3 = formSchema.validate(
          getFormData({
            day: 'invalid',
            month: 'invalid',
            year: 'invalid'
          }),
          opts
        )

        expect(result1.error).toBeTruthy()
        expect(result2.error).toBeTruthy()
        expect(result3.error).toBeTruthy()
      })
    })

    describe('State', () => {
      const date = new Date('2024-12-31')

      it('returns text from state', () => {
        const state = getFormState(date)
        const text = component.getDisplayStringFromState(state)

        expect(text).toBe('31 December 2024')
      })

      it('returns payload from state', () => {
        const state = getFormState(startOfDay(date))
        const payload = component.getFormDataFromState(state)

        expect(payload).toEqual(getFormData(date))
      })

      it('returns state from payload (object)', () => {
        const payload = getFormData(date)
        const value = component.getStateFromValidForm(payload)

        expect(value).toEqual(getFormState(date))
      })

      it('returns state from payload (value)', () => {
        const payload = getFormData(date)
        const value = component.getStateValueFromValidForm(payload)

        expect(value).toEqual(startOfDay(date).toISOString())
      })

      it('returns formatted value for conditions', () => {
        const state = getFormState(date)
        const value = component.getConditionEvaluationStateValue(state)

        expect(value).toBe('2024-12-31')
      })
    })

    describe('View model', () => {
      const date = new Date('2024-12-31')

      it('sets Nunjucks component defaults', () => {
        const payload = getFormData(date)
        const viewModel = component.getViewModel(payload)

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

      it('sets Nunjucks component fieldset', () => {
        const payload = getFormData(date)
        const viewModel = component.getViewModel(payload)

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
        description: 'Trim decimals',
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
              value: getFormData(date)
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
              error: new Error('example date parts field must be a real date')
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
              error: new Error('Example date parts field must include a day')
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
              error: new Error('Example date parts field must include a month')
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
              error: new Error('Example date parts field must include a year')
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
              error: new Error('example date parts field must be a real date')
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
              error: new Error('example date parts field must be a real date')
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
              error: new Error(
                `example date parts field must be the same as or after ${OneDayInPast.toISOString()}`
              )
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
              error: new Error(
                `example date parts field must be the same as or before ${OneDayInFuture.toISOString()}`
              )
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
      let component: DatePartsField

      beforeEach(() => {
        component = new DatePartsField(def, formModel)
      })

      it.each([...assertions])(
        'validates custom example',
        ({ input, output }) => {
          const { formSchema } = component

          const result = formSchema.validate(input, opts)
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
  const fieldClasses = overrides?.classes ?? expect.any(String)

  return {
    label: expect.objectContaining(
      overrides?.label ?? {
        text: expect.any(String)
      }
    ),
    name: fieldName,
    id: fieldName,
    value: payload[fieldName] as number,
    classes: fieldClasses,
    type: 'number'
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
function getFormState(date: Date): FormState {
  return {
    myComponent: date.toISOString()
  }
}
