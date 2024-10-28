import {
  ComponentType,
  type FormDefinition,
  type MonthYearFieldComponent
} from '@defra/forms-model'
import { startOfDay } from 'date-fns'

import { MonthYearField } from '~/src/server/plugins/engine/components/MonthYearField.js'
import { type DateInputItem } from '~/src/server/plugins/engine/components/types.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type FormPayload,
  type FormState
} from '~/src/server/plugins/engine/types.js'

describe('MonthYearField', () => {
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
    let def: MonthYearFieldComponent
    let component: MonthYearField

    beforeEach(() => {
      def = {
        title: 'Example month/year field',
        name: 'myComponent',
        type: ComponentType.MonthYearField,
        options: {}
      } satisfies MonthYearFieldComponent

      component = new MonthYearField(def, formModel)
    })

    describe('Schema', () => {
      it('uses collection titles as labels', () => {
        const { formSchema } = component

        expect(formSchema.describe().keys).toEqual(
          expect.objectContaining({
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
        const componentOptional = new MonthYearField(
          {
            title: 'Example month/year field',
            name: 'myComponent',
            type: ComponentType.MonthYearField,
            options: { required: false }
          },
          formModel
        )

        const { formSchema } = componentOptional

        expect(formSchema.describe().keys).toEqual(
          expect.objectContaining({
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
            month: '12',
            year: '2024'
          }),
          opts
        )

        const result2 = formSchema.validate(
          getFormData({
            month: '2',
            year: '2024'
          }),
          opts
        )

        expect(result1.error).toBeUndefined()
        expect(result2.error).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const { formSchema } = component

        const result = formSchema.validate(
          getFormData({
            month: '',
            year: ''
          }),
          opts
        )

        expect(result.error).toEqual(
          expect.objectContaining({
            message: [
              'Example month/year field must include a month',
              'Example month/year field must include a year'
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

        expect(text).toBe('December 2024')
      })

      it('returns payload from state (object)', () => {
        const state = getFormState(startOfDay(date))
        const payload = component.getFormDataFromState(state)

        expect(payload).toEqual(getFormData(date))
      })

      it('returns payload from state (value)', () => {
        const state = getFormState(startOfDay(date))
        const payload = component.getFormValueFromState(state)

        expect(payload).toEqual(getFormData(date).myComponent)
      })

      it('returns state from payload (object)', () => {
        const payload = getFormData(date)
        const value = component.getStateFromValidForm(payload)

        expect(value).toEqual(getFormState(date))
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
        description: 'Trim decimals',
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
              value: getFormData(date)
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
              error: new Error('Example month/year field must include a month')
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
              error: new Error('Example month/year field must include a year')
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
      let component: MonthYearField

      beforeEach(() => {
        component = new MonthYearField(def, formModel)
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
 * Month & year field view model
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
  const payload = getFormData(date)

  return {
    myComponent: payload
  }
}
