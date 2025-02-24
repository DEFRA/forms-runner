import { ComponentType, type MonthYearFieldComponent } from '@defra/forms-model'
import { startOfDay } from 'date-fns'

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

describe('MonthYearField', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: MonthYearFieldComponent
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example month/year field',
        name: 'myComponent',
        type: ComponentType.MonthYearField,
        options: {}
      } satisfies MonthYearFieldComponent

      collection = new ComponentCollection([def], { model })
      field = collection.fields[0]
    })

    describe('Schema', () => {
      it('uses collection titles as labels', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toEqual(
          expect.objectContaining({
            myComponent__month: expect.objectContaining({
              flags: expect.objectContaining({ label: 'Month' })
            }),
            myComponent__year: expect.objectContaining({
              flags: expect.objectContaining({ label: 'Year' })
            })
          })
        )
      })

      it('uses collection names as keys', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(field.keys).toEqual([
          'myComponent',
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

        expect(keys).toEqual(
          expect.objectContaining({
            myComponent__month: expect.objectContaining({
              flags: expect.objectContaining({ presence: 'required' })
            }),
            myComponent__year: expect.objectContaining({
              flags: expect.objectContaining({ presence: 'required' })
            })
          })
        )
      })

      it('is optional when configured', () => {
        const collectionOptional = new ComponentCollection(
          [
            {
              title: 'Example month/year field',
              name: 'myComponent',
              type: ComponentType.MonthYearField,
              options: { required: false }
            }
          ],
          { model }
        )

        const { formSchema } = collectionOptional
        const { keys } = formSchema.describe()

        expect(keys).toEqual(
          expect.objectContaining({
            myComponent__month: expect.objectContaining({
              allow: ['']
            }),
            myComponent__year: expect.objectContaining({
              allow: ['']
            })
          })
        )

        // Empty optional payload (valid)
        const result1 = collectionOptional.validate(
          getFormData({
            month: '',
            year: ''
          })
        )

        // Partial optional payload (invalid)
        const result2 = collectionOptional.validate(
          getFormData({
            month: '12',
            year: ''
          })
        )

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toEqual([
          expect.objectContaining({
            text: 'Example month/year field must include a year'
          })
        ])
      })

      it('accepts valid values', () => {
        const result1 = collection.validate(
          getFormData({
            month: '12',
            year: '2024'
          })
        )

        const result2 = collection.validate(
          getFormData({
            month: '2',
            year: '2024'
          })
        )

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(
          getFormData({
            month: '',
            year: ''
          })
        )

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Example month/year field must include a month'
          }),
          expect.objectContaining({
            text: 'Example month/year field must include a year'
          })
        ])
      })

      it('adds errors for invalid values', () => {
        const result1 = collection.validate(getFormData({ unknown: 'invalid' }))

        const result2 = collection.validate(
          getFormData({
            month: ['invalid'],
            year: ['invalid']
          })
        )

        const result3 = collection.validate(
          getFormData({
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

        expect(answer1).toBe('December 2024')
        expect(answer2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState(startOfDay(date))
        const state2 = getFormState({})

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData(date))
        expect(payload2).toEqual({})
      })

      it('returns value from state', () => {
        const state1 = getFormState(startOfDay(date))
        const state2 = getFormState({})

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toEqual({
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

        expect(value1).toBe('2024-12')
        expect(value2).toBeNull()
      })

      it('returns null context when date is invalid', () => {
        const state1 = getFormState({ month: 0, year: 2025 })
        const state2 = getFormState({})
        const state3 = getFormState({ month: 13, year: 2025 })

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)
        const value3 = field.getContextValueFromState(state3)

        expect(value1).toBeNull()
        expect(value2).toBeNull()
        expect(value3).toBeNull()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData(date)
        const payload2 = {}

        const state1 = field.getStateFromValidForm(payload1)
        const state2 = field.getStateFromValidForm(payload2)

        expect(state1).toEqual(getFormState(date))
        expect(state2).toEqual(getFormState({}))
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
          month: 'MM',
          year: 'YYYY'
        })

        const viewModel = field.getViewModel(payload)

        expect(viewModel).toEqual(
          expect.objectContaining({
            items: [
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
    const date = new Date('2001-01-01')

    describe.each([
      {
        description: 'Trim empty spaces',
        component: {
          title: 'Example month/year field',
          name: 'myComponent',
          type: ComponentType.MonthYearField,
          options: {}
        } satisfies MonthYearFieldComponent,
        assertions: [
          {
            input: getFormData({
              month: ' 01',
              year: ' 2001'
            }),
            output: {
              value: getFormData(date)
            }
          },
          {
            input: getFormData({
              month: '01 ',
              year: '2001 '
            }),
            output: {
              value: getFormData(date)
            }
          },
          {
            input: getFormData({
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
          title: 'Example month/year field',
          name: 'myComponent',
          type: ComponentType.MonthYearField,
          options: {}
        } satisfies MonthYearFieldComponent,
        assertions: [
          {
            input: getFormData({
              month: '1.2',
              year: '2001.3'
            }),
            output: {
              value: getFormData({
                month: 1.2,
                year: 2001.3
              }),
              errors: [
                expect.objectContaining({
                  text: 'Example month/year field must be a real date'
                }),
                expect.objectContaining({
                  text: 'Example month/year field must be a real date'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Out of range values',
        component: {
          title: 'Example month/year field',
          name: 'myComponent',
          type: ComponentType.MonthYearField,
          options: {}
        } satisfies MonthYearFieldComponent,
        assertions: [
          {
            input: getFormData({
              month: '13',
              year: '2024'
            }),
            output: {
              value: getFormData({
                month: 13,
                year: 2024
              }),
              errors: [
                expect.objectContaining({
                  text: 'Example month/year field must be a real date'
                })
              ]
            }
          },
          {
            input: getFormData({
              month: '1',
              year: '999'
            }),
            output: {
              value: getFormData({
                month: 1,
                year: 999
              }),
              errors: [
                expect.objectContaining({
                  text: 'Example month/year field must be a real date'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Optional fields',
        component: {
          title: 'Example month/year field',
          name: 'myComponent',
          type: ComponentType.MonthYearField,
          options: {
            required: false
          }
        } satisfies MonthYearFieldComponent,
        assertions: [
          {
            input: getFormData({
              month: '',
              year: ''
            }),
            output: {
              value: getFormData({
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
 * Month & year field view model
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
 * Month & year form data
 */
function getFormData(date: Date | FormPayload): FormPayload {
  if (date instanceof Date) {
    date = {
      month: date.getMonth() + 1,
      year: date.getFullYear()
    }
  }

  return {
    myComponent__month: date.month,
    myComponent__year: date.year
  }
}

/**
 * Month & year session state
 */
function getFormState(date: Date | FormPayload): FormState {
  const [month, year] = Object.values(getFormData(date))

  return {
    myComponent__month: month ?? null,
    myComponent__year: year ?? null
  }
}
