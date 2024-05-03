import { DatePartsField } from '~/src/server/plugins/engine/components/DatePartsField.js'

describe('Date parts field', () => {
  test('Should construct appropriate children when required', () => {
    const def = {
      name: 'myComponent',
      title: 'My component',
      options: {},
      schema: {}
    }
    const underTest = new DatePartsField(def, {})
    const returned = underTest.getViewModel({ lang: 'en' })

    expect(returned.fieldset).toEqual({
      legend: {
        classes: 'govuk-label--s',
        text: def.title
      }
    })
    expect(returned.items).toEqual([
      dateComponent('Day', 2),
      dateComponent('Month', 2),
      dateComponent('Year', 4)
    ])
  })

  test('Should construct appropriate children when not required', () => {
    const def = {
      name: 'myComponent',
      title: 'My component',
      options: { required: false },
      schema: {}
    }
    const underTest = new DatePartsField(def, {})
    const returned = underTest.getViewModel({ lang: 'en' })

    expect(returned.fieldset).toEqual({
      legend: {
        classes: 'govuk-label--s',
        text: `${def.title} (optional)`
      }
    })
    expect(returned.items).toEqual([
      dateComponent('Day', 2),
      dateComponent('Month', 2),
      dateComponent('Year', 4)
    ])
  })
  test('Error is displayed correctly', () => {
    const def = {
      name: 'myComponent',
      title: 'My component',
      options: { required: false },
      schema: {},
      type: 'DatePartsField'
    }
    const errors = {
      titleText: 'Fix the following errors',
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

function dateComponent(name, width) {
  return {
    label: name,
    id: `myComponent__${name.toLowerCase()}`,
    name: `myComponent__${name.toLowerCase()}`,
    value: undefined,
    classes: `govuk-input--width-${width}`,
    type: 'number',
    attributes: {}
  }
}

// TODO: write test to make sure maxDaysInPast and maxDaysInFuture work as expected (based on current date instead of server initialisation date)
