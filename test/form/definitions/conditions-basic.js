import {
  ComponentType,
  ConditionType,
  ControllerPath,
  ControllerType,
  Engine,
  OperatorName
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Conditions',
  startPage: '/first-page',
  pages: /** @type {const} */ ([
    {
      title: 'Previous marriages',
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
          name: 'detailsField',
          title: 'Find out more',
          type: ComponentType.Details,
          content: 'Some content goes here',
          options: {}
        },
        {
          name: 'dateField',
          title: 'Date of marriage',
          type: ComponentType.DatePartsField,
          options: {}
        },
        {
          name: 'multilineTextField',
          title: 'Remarks',
          type: ComponentType.MultilineTextField,
          options: {},
          schema: {}
        }
      ],
      section: 'marriage',
      next: [{ path: '/summary' }]
    },
    {
      title: 'Summary',
      path: ControllerPath.Summary,
      controller: ControllerType.Summary
    }
  ]),
  lists: [],
  sections: [
    {
      name: 'marriage',
      title: 'Your marriage'
    }
  ],
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

export const V2 = /** @satisfies {FormDefinition} */ ({
  name: 'Conditions V2',
  engine: Engine.V2,
  startPage: '/first-page',
  pages: /** @type {const} */ ([
    {
      title: 'Previous marriages',
      path: '/first-page',
      components: [
        {
          name: 'yesNoField',
          title: 'Have you previously been married?',
          type: ComponentType.YesNoField,
          options: {}
        }
      ],
      next: []
    },
    {
      title: 'When will you get married?',
      path: '/second-page',
      components: [
        {
          name: 'detailsField',
          title: 'Find out more',
          type: ComponentType.Details,
          content: 'Some content goes here',
          options: {}
        },
        {
          name: 'dateField',
          title: 'Date of marriage',
          type: ComponentType.DatePartsField,
          options: {}
        },
        {
          name: 'multilineTextField',
          title: 'Remarks',
          type: ComponentType.MultilineTextField,
          options: {},
          schema: {}
        }
      ],
      condition: 'isNotPreviouslyMarried',
      section: 'marriage',
      next: []
    },
    {
      title: 'Summary',
      path: ControllerPath.Summary,
      controller: ControllerType.Summary
    }
  ]),
  lists: [],
  sections: [
    {
      name: 'marriage',
      title: 'Your marriage'
    }
  ],
  conditions: [
    {
      displayName: 'Not previously married',
      name: 'isNotPreviouslyMarried',
      value: {
        name: 'Not previously married',
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
              value: 'false',
              display: 'No'
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
