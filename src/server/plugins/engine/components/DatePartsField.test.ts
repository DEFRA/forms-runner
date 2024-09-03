import {
  ComponentType,
  type ComponentDef,
  type DatePartsFieldComponent,
  type FormDefinition
} from '@defra/forms-model'
import { addDays, startOfDay } from 'date-fns'

import { DatePartsField } from '~/src/server/plugins/engine/components/DatePartsField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

describe('Date parts field', () => {
  let formModel: FormModel

  beforeEach(() => {
    const definition: FormDefinition = {
      pages: [],
      lists: [],
      sections: [],
      conditions: []
    }

    formModel = new FormModel(definition, {
      basePath: 'test'
    })
  })

  test('Should construct appropriate children when required', () => {
    const def: ComponentDef = {
      name: 'myComponent',
      title: 'My component',
      type: ComponentType.DatePartsField,
      options: {}
    }

    const underTest = new DatePartsField(def, formModel)
    const returned = underTest.getViewModel({})

    expect(returned.fieldset).toEqual({
      legend: {
        text: def.title,
        classes: 'govuk-fieldset__legend--m'
      }
    })
    expect(returned.items).toEqual([
      dateComponent('Day', 2),
      dateComponent('Month', 2),
      dateComponent('Year', 4)
    ])
  })

  test('Should construct appropriate children when not required', () => {
    const def: ComponentDef = {
      name: 'myComponent',
      title: 'My component',
      type: ComponentType.DatePartsField,
      options: { required: false }
    }

    const underTest = new DatePartsField(def, formModel)
    const returned = underTest.getViewModel({})

    expect(returned.fieldset).toEqual({
      legend: {
        text: `${def.title} (optional)`,
        classes: 'govuk-fieldset__legend--m'
      }
    })
    expect(returned.items).toEqual([
      dateComponent('Day', 2),
      dateComponent('Month', 2),
      dateComponent('Year', 4)
    ])
  })

  test('Error is displayed correctly', () => {
    const def: ComponentDef = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      type: ComponentType.DatePartsField,
      options: { required: false }
    }

    const errors = {
      titleText: 'There is a problem',
      errorList: [
        {
          path: 'myComponent__day',
          href: '#myComponent__day',
          name: 'myComponent__day',
          text: 'Day must be a number'
        }
      ]
    }

    const underTest = new DatePartsField(def, formModel)
    const returned = underTest.getViewModel({}, errors)
    expect(returned.errorMessage?.text).toBe('Day must be a number')
    expect(underTest.getViewModel({}).errorMessage).toBeUndefined()
  })

  test('Condition evaluation used yyyy-MM-dd format', () => {
    const datePartsFieldComponent: ComponentDef = {
      title: 'Example checkboxes',
      name: 'myComponent',
      type: ComponentType.DatePartsField,
      options: {}
    }

    const underTest = new DatePartsField(datePartsFieldComponent, formModel)

    const conditonEvaluationStateValue =
      underTest.getConditionEvaluationStateValue({
        myComponent: '2024-12-31T01:02:03.004Z'
      })

    expect(conditonEvaluationStateValue).toBe('2024-12-31')
  })

  describe('Validation', () => {
    const output = {
      value: {
        myComponent__day: 1,
        myComponent__month: 1,
        myComponent__year: 2001
      }
    }

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
            input: {
              myComponent__day: ' 01',
              myComponent__month: ' 01',
              myComponent__year: ' 2001'
            },
            output
          },
          {
            input: {
              myComponent__day: '01 ',
              myComponent__month: '01 ',
              myComponent__year: '2001 '
            },
            output
          },
          {
            input: {
              myComponent__day: ' 01 \n\n',
              myComponent__month: ' 01 \n\n',
              myComponent__year: ' 2001 \n\n'
            },
            output
          }
        ]
      }
    ])('$description', ({ component: def, assertions }) => {
      let component: DatePartsField

      beforeEach(() => {
        component = new DatePartsField(def, formModel)
      })

      it('validates empty value', () => {
        const { formSchema } = component.children

        const input = {
          myComponent__day: '',
          myComponent__month: '',
          myComponent__year: ''
        }

        const output = {
          value: {
            myComponent__day: '',
            myComponent__month: '',
            myComponent__year: ''
          },
          error: new Error(
            'day must be a number. month must be a number. year must be a number'
          )
        }

        const result = formSchema.validate(input, opts)
        expect(result).toEqual(output)
      })

      it.each([...assertions])(
        'validates custom example',
        ({ input, output }) => {
          const { formSchema } = component.children

          const result = formSchema.validate(input, opts)
          expect(result).toEqual(output)
        }
      )
    })
  })

  describe('State', () => {
    const now = new Date()
    const OneDayInPast = addDays(now, -1)
    const TwoDaysInPast = addDays(now, -2)
    const OneDayInFuture = addDays(now, 1)
    const TwoDaysInFuture = addDays(now, 2)

    describe.each([
      {
        description: 'Options maxDaysInPast',
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
            input: TwoDaysInPast,
            output: {
              value: TwoDaysInPast,
              error: new Error(
                `example date parts field must be the same as or after ${startOfDay(OneDayInPast).toISOString()}`
              )
            }
          },
          {
            input: now,
            output: {
              value: now
            }
          }
        ]
      },
      {
        description: 'Options maxDaysInFuture',
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
            input: TwoDaysInFuture,
            output: {
              value: TwoDaysInFuture,
              error: new Error(
                `example date parts field must be the same as or before ${startOfDay(OneDayInFuture).toISOString()}`
              )
            }
          },
          {
            input: now,
            output: {
              value: now
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
          const keys = component.getStateSchemaKeys()
          const schema = keys[component.name]

          const result = schema.validate(input, opts)
          expect(result).toEqual(output)
        }
      )
    })
  })
})

function dateComponent(name: string, width: number) {
  return {
    label: expect.objectContaining({
      text: name
    }),
    id: `myComponent__${name.toLowerCase()}`,
    name: `myComponent__${name.toLowerCase()}`,
    value: undefined,
    classes: `govuk-input--width-${width}`,
    type: 'number',
    attributes: {}
  }
}
