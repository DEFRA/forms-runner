import {
  ComponentType,
  type FormDefinition,
  type UkAddressFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type FormComponentFieldClass } from '~/src/server/plugins/engine/components/helpers.js'
import { type ViewModel } from '~/src/server/plugins/engine/components/types.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  type FormPayload,
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
    let collection: ComponentCollection
    let component: FormComponentFieldClass

    beforeEach(() => {
      def = {
        title: 'Example UK address',
        name: 'myComponent',
        type: ComponentType.UkAddressField,
        options: {}
      } satisfies UkAddressFieldComponent

      collection = new ComponentCollection([def], { model: formModel })
      component = collection.formItems[0]
    })

    describe('Schema', () => {
      it('uses collection titles as labels', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent__addressLine1',
          expect.objectContaining({
            flags: expect.objectContaining({ label: 'address line 1' })
          })
        )

        expect(keys).toHaveProperty(
          'myComponent__addressLine2',
          expect.objectContaining({
            flags: expect.objectContaining({ label: 'address line 2' })
          })
        )

        expect(keys).toHaveProperty(
          'myComponent__town',
          expect.objectContaining({
            flags: expect.objectContaining({ label: 'town or city' })
          })
        )

        expect(keys).toHaveProperty(
          `myComponent__postcode`,
          expect.objectContaining({
            flags: expect.objectContaining({ label: 'postcode' })
          })
        )
      })

      it('is required by default', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent__addressLine1',
          expect.objectContaining({
            flags: expect.objectContaining({ presence: 'required' })
          })
        )

        expect(keys).toHaveProperty(
          'myComponent__addressLine2',
          expect.objectContaining({
            allow: [''], // Required but empty string is allowed
            flags: expect.objectContaining({ presence: 'required' })
          })
        )

        expect(keys).toHaveProperty(
          'myComponent__town',
          expect.objectContaining({
            flags: expect.objectContaining({ presence: 'required' })
          })
        )

        expect(keys).toHaveProperty(
          `myComponent__postcode`,
          expect.objectContaining({
            flags: expect.objectContaining({ presence: 'required' })
          })
        )
      })

      it('is optional when configured', () => {
        const collectionOptional = new ComponentCollection(
          [
            {
              title: 'Example UK address',
              name: 'myComponent',
              type: ComponentType.UkAddressField,
              options: { required: false }
            }
          ],
          { model: formModel }
        )

        const { formSchema } = collectionOptional
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent__addressLine1',
          expect.objectContaining({ allow: [''] })
        )

        expect(keys).toHaveProperty(
          'myComponent__addressLine2',
          expect.objectContaining({ allow: [''] })
        )

        expect(keys).toHaveProperty(
          'myComponent__town',
          expect.objectContaining({ allow: [''] })
        )

        expect(keys).toHaveProperty(
          `myComponent__postcode`,
          expect.objectContaining({ allow: [''] })
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
        const { formSchema } = collection

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
        const { formSchema } = collection

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
        const { formSchema } = collection

        const result1 = formSchema.validate(
          getFormData({ unknown: 'invalid' }),
          opts
        )

        const result2 = formSchema.validate(
          getFormData({
            addressLine1: ['invalid'],
            addressLine2: ['invalid'],
            town: ['invalid'],
            postcode: ['invalid']
          }),
          opts
        )

        const result3 = formSchema.validate(
          getFormData({
            addressLine1: 'invalid',
            addressLine2: 'invalid',
            town: 'invalid',
            postcode: 'invalid'
          }),
          opts
        )

        expect(result1.error).toBeTruthy()
        expect(result2.error).toBeTruthy()
        expect(result3.error).toBeTruthy()
      })
    })

    describe('State', () => {
      const address: FormPayload = {
        addressLine1: 'Richard Fairclough House',
        addressLine2: 'Knutsford Road',
        town: 'Warrington',
        postcode: 'WA4 1HT'
      }

      it('returns text from state', () => {
        const state1 = getFormState(address)
        const state2 = getFormState({})

        const text1 = component.getDisplayStringFromState(state1)
        const text2 = component.getDisplayStringFromState(state2)

        expect(text1).toBe(
          'Richard Fairclough House, Knutsford Road, Warrington, WA4 1HT'
        )

        expect(text2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState(address)
        const state2 = getFormState({})

        const payload1 = component.getFormDataFromState(state1)
        const payload2 = component.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData(address))
        expect(payload2).toEqual(getFormData({}))
      })

      it('returns value from state', () => {
        const state1 = getFormState(address)
        const state2 = getFormState({})

        const value1 = component.getFormValueFromState(state1)
        const value2 = component.getFormValueFromState(state2)

        expect(value1).toEqual(address)
        expect(value2).toBeUndefined()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData(address)
        const payload2 = getFormData({})

        const value1 = component.getStateFromValidForm(payload1)
        const value2 = component.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState(address))
        expect(value2).toEqual(getFormState({}))
      })
    })

    describe('View model', () => {
      const address: FormPayload = {
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
    const address: FormPayload = {
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
      let collection: ComponentCollection

      beforeEach(() => {
        collection = new ComponentCollection([def], { model: formModel })
      })

      it.each([...assertions])(
        'validates custom example',
        ({ input, output }) => {
          const { formSchema } = collection

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
  address: FormPayload,
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
function getFormData(address: FormPayload): FormPayload {
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
function getFormState(address: FormPayload): FormState {
  const [addressLine1, addressLine2, town, postcode] = Object.values(
    getFormData(address)
  )

  return {
    myComponent__addressLine1: addressLine1 ?? null,
    myComponent__addressLine2: addressLine2 ?? null,
    myComponent__town: town ?? null,
    myComponent__postcode: postcode ?? null
  }
}
