import { ControllerType } from '@defra/forms-model'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import {
  type FormContextRequest,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'
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

  describe('Form journey', () => {
    describe('Summary', () => {
      let request: FormContextRequest

      const itemId1 = 'abc-123'
      const itemId2 = 'xyz-987'

      it('returns the summary path', () => {
        expect(controller.getSummaryPath()).toBe('/test/summary')
      })

      it('returns the repeater summary path', () => {
        const pageUrl = new URL('http://example.com/repeat/pizza-order')

        request = {
          method: 'get',
          url: pageUrl,
          path: pageUrl.pathname,
          params: {
            path: 'pizza-order',
            slug: 'repeat'
          },
          query: {}
        }

        expect(controller.getSummaryPath(request)).toBe(
          '/test/pizza-order/summary'
        )
      })

      it('adds item ID query when in params', () => {
        const pageUrl = new URL(
          `/repeat/pizza-order/${itemId1}?itemId=${itemId2}`,
          'http://example.com'
        )

        request = {
          method: 'get',
          url: pageUrl,
          path: pageUrl.pathname,
          params: {
            path: 'pizza-order',
            slug: 'repeat',
            itemId: itemId1
          },
          query: {
            itemId: itemId2
          }
        }

        expect(controller.getSummaryPath(request)).toBe(
          `/test/pizza-order/summary?itemId=${itemId1}`
        )
      })

      it('removes item ID query when not in params', () => {
        const pageUrl = new URL(
          `/repeat/pizza-order?itemId=${itemId2}`,
          'http://example.com'
        )

        request = {
          method: 'get',
          url: pageUrl,
          path: pageUrl.pathname,
          params: {
            path: 'pizza-order',
            slug: 'repeat'
          },
          query: {
            itemId: itemId2
          }
        }

        expect(controller.getSummaryPath(request)).toBe(
          '/test/pizza-order/summary'
        )
      })
    })
  })
})
