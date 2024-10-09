import {
  ComponentType,
  ControllerType,
  type ComponentDef,
  type FormDefinition,
  type PageRepeat
} from '@defra/forms-model'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'

describe('RepeatPageController', () => {
  const component1: ComponentDef = {
    name: 'toppings',
    title: 'Toppings',
    type: ComponentType.TextField,
    options: {},
    schema: {}
  }

  const component2: ComponentDef = {
    name: 'quantity',
    title: 'Quantity',
    type: ComponentType.NumberField,
    options: {},
    schema: {}
  }

  let page: PageRepeat
  let definition: FormDefinition
  let formModel: FormModel
  let controller: RepeatPageController

  beforeEach(() => {
    page = {
      path: '/first-page',
      title: 'Add pizza',
      components: [component1, component2],
      controller: ControllerType.Repeat,
      repeat: {
        schema: { min: 1, max: 25 },
        options: { name: 'pizza', title: 'Pizza' }
      },
      next: []
    }

    definition = {
      pages: [page],
      lists: [],
      sections: [],
      conditions: []
    }

    formModel = new FormModel(definition, {
      basePath: 'test'
    })

    controller = new RepeatPageController(formModel, page)
  })

  describe('Constructor', () => {
    it('throws if page controller is not ControllerType.Repeat', () => {
      expect(() => {
        const repeatController = new RepeatPageController(formModel, {
          path: '/first-page',
          title: 'Pizza',
          components: [component1],
          next: []
        })

        return repeatController
      }).toThrow('Invalid controller for Repeat page')
    })
  })

  describe('Form validation', () => {
    it('includes title text and errors', () => {
      const result = controller.validateForm({})

      expect(result.errors).toEqual(
        expect.objectContaining({
          titleText: 'There is a problem',
          errorList: [
            {
              path: 'toppings',
              href: '#toppings',
              name: 'toppings',
              text: 'Select toppings'
            },
            {
              path: 'quantity',
              href: '#quantity',
              name: 'quantity',
              text: 'Select quantity'
            },
            {
              href: '#itemId',
              name: 'itemId',
              path: 'itemId',
              text: 'Select itemId'
            }
          ]
        })
      )
    })

    it('includes all field errors', () => {
      const result = controller.validateForm({})
      expect(result.errors?.errorList).toHaveLength(3)
    })
  })
})
