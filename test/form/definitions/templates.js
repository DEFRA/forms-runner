import {
  ComponentType,
  ConditionType,
  ControllerType,
  OperatorName
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Templates',
  pages: [
    {
      title: 'Start page',
      path: '/start',
      controller: ControllerType.Start,
      components: [
        {
          name: 'Jhimsh',
          title: 'Html',
          type: ComponentType.Html,
          content: '<p class="govuk-body">Welcome to templating.</p>\n',
          options: {}
        }
      ],
      next: [
        {
          path: '/full-name'
        }
      ]
    },
    {
      title: "What's your name?",
      path: '/full-name',
      next: [
        {
          path: '/are-you-in-england'
        }
      ],
      components: [
        {
          name: 'WmHfSb',
          title: "What's your full name?",
          type: ComponentType.TextField,
          hint: '',
          options: {},
          schema: {}
        }
      ]
    },
    {
      title: 'Are you in England, {{ WmHfSb }}?',
      path: '/are-you-in-england',
      next: [
        {
          path: '/you-must-be-in-england',
          condition: 'uFOrmA'
        },
        {
          path: '/what-is-your-business'
        }
      ],
      components: [
        {
          name: 'TKsWbP',
          title: 'Are you in England, {{ WmHfSb }}?',
          type: ComponentType.YesNoField,
          hint: '',
          options: {}
        }
      ]
    },
    {
      title: 'You must be in England',
      path: '/you-must-be-in-england',
      next: [],
      components: [
        {
          name: 'FGyiLS',
          title: 'You must be in England',
          type: ComponentType.Html,
          content: '<p class="govuk-body">You must be in England.</p>\n',
          options: {}
        }
      ]
    },
    {
      title: 'What is your business, {{ WmHfSb }}?',
      path: '/what-is-your-business',
      next: [
        {
          path: '/information'
        }
      ],
      components: [
        {
          name: 'sdFYHf',
          title: 'What is your business, {{ WmHfSb }}?',
          type: ComponentType.RadiosField,
          list: 'dfdGFY',
          hint: '',
          options: {}
        }
      ]
    },
    {
      title: 'Information: In England? {{ TKsWbP }}?',
      path: '/information',
      next: [
        {
          path: '/summary'
        }
      ],
      components: [
        {
          name: 'Bcrhst',
          title: 'Html',
          type: ComponentType.Html,
          content:
            '<p class="govuk-body">Welcome to Templates.{%- assign inEngland = "/are-you-in-england" | page -%}<span data-testid="output-1">{{ inEngland.title | evaluate }}</span><br><span data-testid="output-2">{{ \'sdFYHf\' | answer }}</span><br><span data-testid="output-3">{{ \'TKsWbP\' | answer }}</span><br><span data-testid="output-4">{{ inEngland.path | href }}</span></p>\n',
          options: {}
        }
      ]
    },
    {
      path: '/summary',
      controller: ControllerType.Summary,
      title: 'Check your answers before submitting your form'
    }
  ],
  lists: [
    {
      title: 'What is the nature of your business?',
      name: 'dfdGFY',
      type: 'string',
      items: [
        {
          text: 'A grower or producer of agricultural or horticultural produce',
          description: 'For example, arable or livestock farmer',
          value: 'grower'
        },
        {
          text: 'A business processing agricultural or horticultural products',
          description:
            'For example a cheese processing business owner by farmer',
          value: 'business'
        },
        {
          text: 'None of the above',
          value: 'none'
        }
      ]
    }
  ],
  sections: [],
  conditions: [
    {
      name: 'uFOrmA',
      displayName: 'notEngland',
      value: {
        name: 'notEngland',
        conditions: [
          {
            field: {
              name: 'TKsWbP',
              type: ComponentType.YesNoField,
              display: 'Are you in England?'
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
  startPage: '/start'
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
