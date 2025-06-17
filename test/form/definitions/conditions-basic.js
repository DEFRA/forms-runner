import {
  ComponentType,
  ConditionType,
  ControllerPath,
  ControllerType,
  Engine,
  OperatorName,
  SchemaVersion
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
  schema: SchemaVersion.V2,
  engine: Engine.V2,
  startPage: '/first-page',
  pages: /** @type {const} */ ([
    {
      title: 'Previous marriages',
      path: '/first-page',
      components: [
        {
          id: '717eb213-4e4b-4a2d-9cfd-2780f5e1e3e5',
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
      condition: '6c9e2f4a-1d7b-5e8c-3f6a-9e2d5b7c4f1a',
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
      id: '6c9e2f4a-1d7b-5e8c-3f6a-9e2d5b7c4f1a',
      displayName: 'Not previously married',
      items: [
        {
          id: '4f7e1a9c-2b5d-8e3f-6c1a-7f9e2d4b5c8a',
          componentId: '717eb213-4e4b-4a2d-9cfd-2780f5e1e3e5',
          operator: OperatorName.Is,
          type: ConditionType.BooleanValue,
          value: false
        }
      ]
    }
  ],
  outputEmail: 'enrique.chase@defra.gov.uk'
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
