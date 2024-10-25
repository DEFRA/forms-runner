import {
  ComponentType,
  type FormDefinition,
  type UkAddressFieldComponent
} from '@defra/forms-model'

import { UkAddressField } from '~/src/server/plugins/engine/components/UkAddressField.js'
import { type ViewModel } from '~/src/server/plugins/engine/components/types.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type FormData,
  type FormState
} from '~/src/server/plugins/engine/types.js'

describe('UkAddressField', () => {
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
    let def: UkAddressFieldComponent
    let component: UkAddressField

    beforeEach(() => {
      def = {
        title: 'Example UK address',
        name: 'myComponent',
        type: ComponentType.UkAddressField,
        options: {}
      } satisfies UkAddressFieldComponent

      component = new UkAddressField(def, formModel)
    })

    describe('Schema', () => {
      it('uses collection titles as labels', () => {
        const { formSchema } = component

        expect(formSchema.describe().keys).toEqual(
          expect.objectContaining({
            myComponent__addressLine1: expect.objectContaining({
              flags: expect.objectContaining({ label: 'address line 1' })
            }),
            myComponent__addressLine2: expect.objectContaining({
              flags: expect.objectContaining({ label: 'address line 2' })
            }),
            myComponent__town: expect.objectContaining({
              flags: expect.objectContaining({ label: 'town or city' })
            }),
            myComponent__postcode: expect.objectContaining({
              flags: expect.objectContaining({ label: 'postcode' })
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
        const componentOptional = new UkAddressField(
          {
            title: 'Example UK address',
            name: 'myComponent',
            type: ComponentType.UkAddressField,
            options: { required: false }
          },
          formModel
        )

        const { formSchema } = componentOptional

        expect(formSchema.describe().keys).toEqual(
          expect.objectContaining({
            myComponent__addressLine1: expect.objectContaining({
              allow: ['']
            }),
            myComponent__addressLine2: expect.objectContaining({
              allow: ['']
            }),
            myComponent__town: expect.objectContaining({
              allow: ['']
            }),
            myComponent__postcode: expect.objectContaining({
              allow: ['']
            })
          })
        )

        const result = formSchema.validate(
          getFormData({
            addressLine1: '',
            addressLine2: '',
            town: '',
            postcode: ''
          }),
          opts
        )

        expect(result.error).toBeUndefined()
      })

      it('accepts valid values', () => {
        const { formSchema } = component

        const result1 = formSchema.validate(
          getFormData({
            addressLine1: 'Richard Fairclough House',
            addressLine2: 'Knutsford Road',
            town: 'Warrington',
            postcode: 'WA4 1HT'
          }),
          opts
        )

        const result2 = formSchema.validate(
          getFormData({
            addressLine1: 'Richard Fairclough House',
            addressLine2: '', // Optional field
            town: 'Warrington',
            postcode: 'WA4 1HT'
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
            addressLine1: '',
            addressLine2: '',
            town: '',
            postcode: ''
          }),
          opts
        )

        expect(result.error).toEqual(
          expect.objectContaining({
            message: [
              'Enter address line 1',
              'Enter town or city',
              'Enter postcode'
            ].join('. ')
          })
        )
      })

      it('adds errors for invalid values', () => {
        const { formSchema } = component

        const result1 = formSchema.validate(['invalid'], opts)
        const result2 = formSchema.validate({ unknown: 'invalid' }, opts)

        expect(result1.error).toBeTruthy()
        expect(result2.error).toBeTruthy()
      })
    })

    describe('State', () => {
      const address: FormData = {
        addressLine1: 'Richard Fairclough House',
        addressLine2: 'Knutsford Road',
        town: 'Warrington',
        postcode: 'WA4 1HT'
      }

      it('returns text from state', () => {
        const state = getFormState(address)
        const text = component.getDisplayStringFromState(state)

        expect(text).toBe(
          'Richard Fairclough House, Knutsford Road, Warrington, WA4 1HT'
        )
      })

      it('returns payload from state', () => {
        const state = getFormState(address)
        const payload = component.getFormDataFromState(state)

        expect(payload).toEqual(getFormData(address))
      })

      it('returns state from payload (object)', () => {
        const payload = getFormData(address)
        const value = component.getStateFromValidForm(payload)

        expect(value).toEqual(getFormState(address))
      })

      it('returns state from payload (value)', () => {
        const payload = getFormData(address)
        const value = component.getStateValueFromValidForm(payload)

        expect(value).toEqual(address)
      })
    })

    describe('View model', () => {
      const address: FormData = {
        addressLine1: 'Richard Fairclough House',
        addressLine2: 'Knutsford Road',
        town: 'Warrington',
        postcode: 'WA4 1HT'
      }

      it('sets Nunjucks component defaults', () => {
        const payload = getFormData(address)
        const viewModel = component.getViewModel(payload)

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'myComponent',
            id: 'myComponent',
            value: undefined,
            children: expect.arrayContaining([
              expect.objectContaining({
                model: getViewModel(address, 'addressLine1', {
                  label: { text: 'Address line 1' },
                  attributes: { autocomplete: 'address-line1' }
                })
              }),

              expect.objectContaining({
                model: getViewModel(address, 'addressLine2', {
                  label: { text: 'Address line 2 (optional)' },
                  attributes: { autocomplete: 'address-line2' },
                  value: address.addressLine2
                })
              }),

              expect.objectContaining({
                model: getViewModel(address, 'town', {
                  label: { text: 'Town or city' },
                  classes: 'govuk-!-width-two-thirds',
                  attributes: { autocomplete: 'address-level2' },
                  value: address.town
                })
              }),

              expect.objectContaining({
                model: getViewModel(address, 'postcode', {
                  label: { text: 'Postcode' },
                  classes: 'govuk-input--width-10',
                  attributes: { autocomplete: 'postal-code' },
                  value: address.postcode
                })
              })
            ])
          })
        )
      })

      it('sets Nunjucks component fieldset', () => {
        const payload = getFormData(address)
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
    const address: FormData = {
      addressLine1: 'Richard Fairclough House',
      addressLine2: 'Knutsford Road',
      town: 'Warrington',
      postcode: 'WA4 1HT'
    }

    const addressLine1Invalid =
      'Address line 1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    const addressLine2Invalid =
      'Address line 2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    const townInvalid =
      'Town 000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    const postcodeInvalid = '111 XX2'

    describe.each([
      {
        description: 'Trim empty spaces',
        component: {
          title: 'Example UK address',
          name: 'myComponent',
          type: ComponentType.UkAddressField,
          options: {}
        } satisfies UkAddressFieldComponent,
        assertions: [
          {
            input: getFormData({
              addressLine1: ' Richard Fairclough House',
              addressLine2: ' Knutsford Road',
              town: ' Warrington',
              postcode: ' WA4 1HT'
            }),
            output: {
              value: getFormData(address)
            }
          },
          {
            input: getFormData({
              addressLine1: 'Richard Fairclough House ',
              addressLine2: 'Knutsford Road ',
              town: 'Warrington ',
              postcode: 'WA4 1HT '
            }),
            output: {
              value: getFormData(address)
            }
          },
          {
            input: getFormData({
              addressLine1: ' Richard Fairclough House \n\n',
              addressLine2: ' Knutsford Road \n\n',
              town: ' Warrington \n\n',
              postcode: ' WA4 1HT \n\n'
            }),
            output: {
              value: getFormData(address)
            }
          }
        ]
      },
      {
        description: 'Out of range values',
        component: {
          title: 'Example UK address',
          name: 'myComponent',
          type: ComponentType.UkAddressField,
          options: {}
        } satisfies UkAddressFieldComponent,
        assertions: [
          {
            input: getFormData({
              addressLine1: addressLine1Invalid,
              addressLine2: 'Knutsford Road',
              town: 'Warrington',
              postcode: 'WA4 1HT'
            }),
            output: {
              value: getFormData({
                addressLine1: addressLine1Invalid,
                addressLine2: 'Knutsford Road',
                town: 'Warrington',
                postcode: 'WA4 1HT'
              }),
              error: new Error('address line 1 must be 100 characters or less')
            }
          },
          {
            input: getFormData({
              addressLine1: 'Richard Fairclough House',
              addressLine2: addressLine2Invalid,
              town: 'Warrington',
              postcode: 'WA4 1HT'
            }),
            output: {
              value: getFormData({
                addressLine1: 'Richard Fairclough House',
                addressLine2: addressLine2Invalid,
                town: 'Warrington',
                postcode: 'WA4 1HT'
              }),
              error: new Error('address line 2 must be 100 characters or less')
            }
          },
          {
            input: getFormData({
              addressLine1: 'Richard Fairclough House',
              addressLine2: 'Knutsford Road',
              town: townInvalid,
              postcode: 'WA4 1HT'
            }),
            output: {
              value: getFormData({
                addressLine1: 'Richard Fairclough House',
                addressLine2: 'Knutsford Road',
                town: townInvalid,
                postcode: 'WA4 1HT'
              }),
              error: new Error('town or city must be 100 characters or less')
            }
          },
          {
            input: getFormData({
              addressLine1: 'Richard Fairclough House',
              addressLine2: 'Knutsford Road',
              town: 'Warrington',
              postcode: postcodeInvalid
            }),
            output: {
              value: getFormData({
                addressLine1: 'Richard Fairclough House',
                addressLine2: 'Knutsford Road',
                town: 'Warrington',
                postcode: postcodeInvalid
              }),
              error: new Error('Enter a valid postcode')
            }
          }
        ]
      }
    ])('$description', ({ component: def, assertions }) => {
      let component: UkAddressField

      beforeEach(() => {
        component = new UkAddressField(def, formModel)
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
 * UK address field view model
 */
function getViewModel(
  address: FormData,
  name: string,
  overrides?: Partial<ViewModel>
): Partial<ViewModel> {
  const payload = getFormData(address)
  const fieldName = `myComponent__${name}`
  const fieldClasses = overrides?.classes ?? undefined
  const fieldAttributes = overrides?.attributes ?? expect.any(Object)

  return {
    label: expect.objectContaining(
      overrides?.label ?? {
        text: expect.any(String)
      }
    ),
    name: fieldName,
    id: fieldName,
    value: payload[fieldName],
    classes: fieldClasses,
    attributes: fieldAttributes
  }
}

/**
 * UK address form data
 */
function getFormData(address: FormData): FormData {
  return {
    myComponent__addressLine1: address.addressLine1,
    myComponent__addressLine2: address.addressLine2,
    myComponent__town: address.town,
    myComponent__postcode: address.postcode
  }
}

/**
 * UK address session state
 */
function getFormState(address: FormData): FormState {
  return {
    myComponent: {
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      town: address.town,
      postcode: address.postcode
    }
  }
}
