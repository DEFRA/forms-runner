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
  pages: [
    {
      title: 'Have you previously been married?',
      path: '/first-page',
      components: [
        {
          name: 'yesNoField',
          title: 'Have you previously been married?',
          type: ComponentType.YesNoField,
          options: {}
        }
      ],
      next: [
        { path: '/second-page' },
        { path: '/summary', condition: 'isPreviouslyMarried' }
      ]
    },
    {
      title: 'When will you get married?',
      path: '/second-page',
      components: [
        {
          name: 'dateField',
          title: 'Date of marriage',
          type: ComponentType.DatePartsField,
          options: {}
        },
        {
          name: 'detailsField',
          title: 'Find out more',
          type: ComponentType.Details,
          content: 'Some content goes here',
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
  ],
  lists: [],
  sections: [],
  conditions: [
    {
      displayName: 'Previously married',
      name: 'isPreviouslyMarried',
      value: {
        name: 'Previously married',
        conditions: [
          {
            field: {
              name: 'yesNoField',
              display: 'Have you previously been married?',
              type: ComponentType.YesNoField
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'true',
              display: 'Yes'
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
