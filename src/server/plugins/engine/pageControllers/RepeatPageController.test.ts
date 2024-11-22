import { ControllerType } from '@defra/forms-model'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { type FormSubmissionError } from '~/src/server/plugins/engine/types.js'
import definition from '~/test/form/definitions/repeat.js'

describe('RepeatPageController', () => {
  let model: FormModel
  let controller: RepeatPageController

  beforeEach(() => {
    const { pages } = definition

    model = new FormModel(definition, {
      basePath: 'test'
    })

    controller = new RepeatPageController(model, pages[0])
  })

  describe('Constructor', () => {
    it('throws if page controller is not ControllerType.Repeat', () => {
      const { pages } = structuredClone(definition)

      // Change the controller type
      pages[0].controller = ControllerType.Summary
      delete pages[0].repeat

      expect(() => new RepeatPageController(model, pages[0])).toThrow(
        'Invalid controller for Repeat page'
      )
    })
  })

  describe('Form validation', () => {
    it('includes title text and errors', () => {
      const result = controller.collection.validate()

      expect(result.errors).toEqual<FormSubmissionError[]>([
        {
          path: ['toppings'],
          href: '#toppings',
          name: 'toppings',
          text: 'Select toppings',
          context: {
            key: 'toppings',
            label: 'toppings',
            title: 'Toppings'
          }
        },
        {
          path: ['quantity'],
          href: '#quantity',
          name: 'quantity',
          text: 'Enter quantity',
          context: {
            key: 'quantity',
            label: 'quantity',
            title: 'Quantity'
          }
        },
        {
          path: ['itemId'],
          href: '#itemId',
          name: 'itemId',
          text: 'Select itemId',
          context: {
            key: 'itemId',
            label: 'itemId'
          }
        }
      ])
    })

    it('includes all field errors', () => {
      const result = controller.collection.validate()
      expect(result.errors).toHaveLength(3)
    })
  })
})
