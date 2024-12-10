import {
  ComponentType,
  ControllerPath,
  ControllerType
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Repeat form',
  startPage: '/pizza-order',
  pages: /** @type {const} */ ([
    {
      title: 'Pizza order',
      path: '/pizza-order',
      controller: ControllerType.Repeat,
      repeat: {
        options: {
          name: 'pizza',
          title: 'Pizza'
        },
        schema: {
          min: 1,
          max: 2
        }
      },
      section: 'food',
      next: [
        {
          path: '/summary'
        }
      ],
      components: [
        {
          name: 'toppings',
          title: 'Toppings',
          type: ComponentType.TextField,
          hint: '',
          options: {},
          schema: {}
        },
        {
          name: 'quantity',
          title: 'Quantity',
          type: ComponentType.NumberField,
          hint: '',
          options: {},
          schema: {}
        }
      ]
    },
    {
      path: ControllerPath.Summary,
      controller: ControllerType.Summary,
      title: 'Summary'
    }
  ]),
  sections: [
    {
      name: 'food',
      title: 'Food',
      hideTitle: false
    }
  ],
  conditions: [],
  lists: [],
  outputEmail: 'enrique.chase@defra.gov.uk'
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
