import {
  ComponentType,
  ConditionType,
  ControllerPath,
  ControllerType,
  OperatorName
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Conditions dates',
  startPage: '/page-one',
  pages: /** @type {const} */ ([
    {
      path: '/page-one',
      title: 'Page one',
      components: [
        {
          name: 'dateField',
          title: 'Date field',
          type: ComponentType.DatePartsField,
          hint: '',
          options: {}
        }
      ],
      next: [
        {
          path: '/is-not-2024-08-01'
        },
        {
          path: '/is-2024-08-01',
          condition: 'dateFieldCondition'
        }
      ]
    },
    {
      path: ControllerPath.Summary,
      controller: ControllerType.Summary,
      title: 'Is not 2024-08-01'
    },
    {
      path: '/is-2024-08-01',
      title: 'Is 2024-08-01',
      components: [],
      next: []
    }
  ]),
  lists: [],
  sections: [],
  conditions: [
    {
      name: 'dateFieldCondition',
      displayName: 'Is 2024-08-01',
      value: {
        name: 'Is 2024-08-01',
        conditions: [
          {
            field: {
              name: 'dateField',
              type: ComponentType.DatePartsField,
              display: 'Date field'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: '2024-08-01',
              display: '2024-08-01'
            }
          }
        ]
      }
    }
  ],
  outputEmail: 'enrique.chase@defra.gov.uk'
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
