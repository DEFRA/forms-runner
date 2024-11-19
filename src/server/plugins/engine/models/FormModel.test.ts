import {
  ComponentType,
  ConditionType,
  ControllerType,
  Coordinator,
  OperatorName,
  type FormDefinition
} from '@defra/forms-model'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'

describe('FormModel', () => {
  let definition: FormDefinition

  beforeEach(() => {
    definition = {
      name: 'Apostrophe',
      pages: [
        {
          title: 'Page one',
          path: '/page-one',
          next: [
            {
              path: '/page-two',
              condition: 'ZCXeMz'
            },
            {
              path: '/summary'
            }
          ],
          components: [
            {
              name: 'NIJphU',
              title: 'Text field',
              type: ComponentType.TextField,
              hint: '',
              options: {},
              schema: {}
            },
            {
              name: 'iraEpG',
              title: 'Select field',
              type: ComponentType.SelectField,
              hint: '',
              list: 'Ssrxdy',
              options: {}
            }
          ]
        },
        {
          title: 'Page two',
          path: '/page-two',
          next: [
            {
              path: '/summary'
            }
          ],
          components: [
            {
              name: 'FrTxfg',
              title: 'Month & year field',
              type: ComponentType.MonthYearField,
              hint: '',
              options: {}
            }
          ]
        },
        {
          title: 'test',
          path: '/summary',
          controller: ControllerType.Summary
        }
      ],
      lists: [
        {
          title: 'test',
          name: 'Ssrxdy',
          type: 'string',
          items: [
            {
              text: 'two3',
              value: 'two3'
            },
            {
              text: 'two2',
              value: 'two2'
            },
            {
              text: "two's",
              value: "two's"
            },
            {
              text: "shouldn't've",
              value: "shouldn't've"
            }
          ]
        }
      ],
      sections: [
        {
          name: 'section',
          title: 'Section title',
          hideTitle: false
        }
      ],
      conditions: [
        {
          name: 'ZCXeMz',
          displayName: 'test',
          value: {
            name: 'test',
            conditions: [
              {
                field: {
                  name: 'NIJphU',
                  type: ComponentType.TextField,
                  display: 'Text field'
                },
                operator: OperatorName.Is,
                value: {
                  type: ConditionType.Value,
                  value: "ap'ostrophe's",
                  display: "ap'ostrophe's"
                }
              },
              {
                coordinator: Coordinator.AND,
                field: {
                  name: 'iraEpG',
                  type: ComponentType.SelectField,
                  display: 'Select field'
                },
                operator: OperatorName.Is,
                value: {
                  type: ConditionType.Value,
                  value: "shouldn't've",
                  display: "shouldn't've"
                }
              }
            ]
          }
        }
      ]
    }
  })

  describe('Constructor', () => {
    it("doesn't throw when conditions are passed with apostrophes", () => {
      expect(() => {
        const model = new FormModel(definition, {
          basePath: 'test'
        })

        return model
      }).not.toThrow()
    })
  })
})
