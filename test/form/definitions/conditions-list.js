import {
  ComponentType,
  ConditionType,
  ControllerType,
  Engine,
  OperatorName
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Conditional list items',
  pages: [
    {
      id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
      title: 'Summary',
      path: '/summary',
      controller: ControllerType.Summary
    },
    {
      title: 'Are you veggie?',
      path: '/are-you-veggie',
      next: [
        {
          path: '/type'
        }
      ],
      components: [
        {
          name: 'gXsqLq',
          title: 'Are you veggie?',
          type: ComponentType.YesNoField,
          options: {}
        }
      ]
    },
    {
      title: 'Type',
      path: '/type',
      next: [
        {
          path: '/toppings'
        }
      ],
      components: [
        {
          name: 'QwcNsc',
          title: 'Type',
          type: ComponentType.RadiosField,
          list: 'hIYxMw',
          options: {}
        }
      ]
    },
    {
      title: 'Toppings',
      path: '/toppings',
      next: [
        {
          path: '/summary'
        }
      ],
      components: [
        {
          name: 'zeQDES',
          title: 'Toppings',
          type: ComponentType.CheckboxesField,
          list: 'pMdDIh',
          options: {}
        }
      ]
    }
  ],
  conditions: [
    {
      name: 'sieBra',
      displayName: 'isVeggie',
      value: {
        name: 'isVeggie',
        conditions: [
          {
            field: {
              name: 'gXsqLq',
              type: ComponentType.YesNoField,
              display: 'Are you veggie?'
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
    },
    {
      name: 'naJibN',
      displayName: 'isNotVeggie',
      value: {
        name: 'isNotVeggie',
        conditions: [
          {
            field: {
              name: 'gXsqLq',
              type: ComponentType.YesNoField,
              display: 'Are you veggie?'
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
    },
    {
      name: 'NcPUbs',
      displayName: 'isNotVegan',
      value: {
        name: 'isNotVegan',
        conditions: [
          {
            field: {
              name: 'QwcNsc',
              type: ComponentType.RadiosField,
              display: 'Type'
            },
            operator: OperatorName.IsNot,
            value: {
              type: ConditionType.Value,
              value: 'vegan',
              display: 'Vegan'
            }
          }
        ]
      }
    }
  ],
  sections: [],
  lists: [
    {
      title: 'Type',
      name: 'hIYxMw',
      type: 'string',
      items: [
        {
          text: 'Vegetarian',
          value: 'vegetarian',
          condition: 'sieBra'
        },
        {
          text: 'Vegan',
          value: 'vegan',
          condition: 'sieBra'
        },
        {
          text: 'Meat eater',
          value: 'meat',
          condition: 'naJibN'
        }
      ]
    },
    {
      title: 'Topping',
      name: 'pMdDIh',
      type: 'string',
      items: [
        {
          text: 'Onions',
          value: 'onions'
        },
        {
          text: 'Peppers',
          value: 'peppers'
        },
        {
          text: 'Mushrooms',
          value: 'mushrooms'
        },
        {
          text: 'Cheese',
          value: 'cheese',
          condition: 'NcPUbs'
        },
        {
          text: 'Ham',
          value: 'ham',
          condition: 'naJibN'
        },
        {
          text: 'Chicken',
          value: 'chicken',
          condition: 'naJibN'
        },
        {
          text: 'Pepperoni',
          value: 'pepperoni',
          condition: 'naJibN'
        },
        {
          text: 'Tofu',
          value: 'tofu',
          condition: 'sieBra'
        }
      ]
    }
  ],
  engine: Engine.V1,
  startPage: '/are-you-veggie'
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
