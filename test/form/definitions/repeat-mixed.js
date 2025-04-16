import { ComponentType } from '@defra/forms-model'

import definition from '~/test/form/definitions/repeat.js'

export default /** @satisfies {FormDefinition} */ ({
  ...definition,

  name: 'Repeat form mixed',
  startPage: '/delivery-or-collection',
  pages: /** @type {const} */ ([
    {
      title: 'Delivery or collection',
      path: '/delivery-or-collection',
      components: [
        {
          name: 'orderType',
          title: 'How would you like to receive your pizza?',
          shortDescription: 'How you would like to receive your pizza',
          type: ComponentType.RadiosField,
          list: 'orderTypeOption',
          options: {}
        }
      ],
      next: [
        {
          path: '/pizza-order'
        }
      ]
    },

    // Combine with repeat form pages
    ...definition.pages
  ]),
  lists: [
    {
      name: 'orderTypeOption',
      title: 'Order type',
      type: 'string',
      items: [
        {
          text: 'Delivery',
          value: 'delivery'
        },
        {
          text: 'Collection',
          value: 'collection'
        }
      ]
    }
  ]
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
