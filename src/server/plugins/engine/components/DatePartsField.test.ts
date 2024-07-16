import { ComponentType, type ComponentDef } from '@defra/forms-model'

import { DatePartsField } from '~/src/server/plugins/engine/components/DatePartsField.js'

describe('Date parts field', () => {
  test('Should construct appropriate children when required', () => {
    const def: ComponentDef = {
      name: 'myComponent',
      title: 'My component',
      type: ComponentType.TextField,
      options: {},
      schema: {}
    }

    const underTest = new DatePartsField(def, {})
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
      type: ComponentType.TextField,
      options: { required: false },
      schema: {}
    }

    const underTest = new DatePartsField(def, {})
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
      options: { required: false },
      schema: {}
    }

    const errors = {
      titleText: 'There is a problem',
      errorList: [
        {
          path: 'approximate__day',
          href: '#approximate__day',
          name: 'approximate__day',
          text: '"Day" must be a number'
        }
      ]
    }
    const underTest = new DatePartsField(def)
    const returned = underTest.getViewModel({}, errors)
    expect(returned.errorMessage.text).toBe('"Day" must be a number')
    expect(underTest.getViewModel({}).errorMessage).toBeUndefined()
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

// TODO: write test to make sure maxDaysInPast and maxDaysInFuture work as expected (based on current date instead of server initialisation date)
