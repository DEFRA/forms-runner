import {
  ComponentType,
  ConditionType,
  ControllerPath,
  ControllerType,
  OperatorName
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Conditions',
  startPage: '/first-page',
  pages: /** @type {const} */ ([
    {
      title: 'Pay charges',
      path: '/first-page',
      components: [
        {
          name: 'HJrybi',
          title: 'Html',
          type: ComponentType.Html,
          content: 'This is info for Barn owls',
          options: {
            condition: 'isBarnOwl'
          }
        },
        {
          name: 'VjISpj',
          title: 'Html',
          type: ComponentType.Html,
          content: 'This is info for other breeds',
          options: {
            condition: 'notBarnOwl'
          }
        },
        {
          name: 'XEaUmK',
          title: 'Select from the list',
          type: ComponentType.RadiosField,
          hint: '',
          list: 'condList',
          options: {}
        }
      ],
      next: [{ path: '/summary' }]
    },
    {
      title: 'Summary',
      path: ControllerPath.Summary,
      controller: ControllerType.Summary
    }
  ]),
  lists: [
    {
      title: 'Example list with conditional elements',
      name: 'condList',
      type: 'string',
      items: [
        {
          text: 'Option 1',
          value: '1',
          condition: 'isBarnOwl'
        },
        {
          text: 'Option 2',
          value: '2',
          condition: 'isBarnOwl'
        },
        {
          text: 'Option 3',
          value: '3',
          condition: 'notBarnOwl'
        },
        {
          text: 'Option 4',
          value: '4',
          condition: 'notBarnOwl'
        }
      ]
    }
  ],
  sections: [
    {
      name: 'charges',
      title: 'Charges'
    }
  ],
  conditions: [
    {
      name: 'isBarnOwl',
      displayName: 'Is barn owl',
      value: {
        name: 'Is barn owl',
        conditions: [
          {
            field: {
              name: 'animalType',
              type: ComponentType.RadiosField,
              display:
                'Which species do you want to apply for a class licence for?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'Barn owl',
              display: 'Barn owl '
            }
          }
        ]
      }
    },
    {
      name: 'notBarnOwl',
      displayName: 'Is not barn owl',
      value: {
        name: 'Is not barn owl',
        conditions: [
          {
            field: {
              name: 'animalType',
              type: ComponentType.RadiosField,
              display:
                'Which species do you want to apply for a class licence for?'
            },
            operator: OperatorName.IsNot,
            value: {
              type: ConditionType.Value,
              value: 'Barn owl',
              display: 'Barn owl '
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
