import { FORM_PREFIX } from '~/src/server/constants.js'
import {
  FormModel,
  SummaryViewModel
} from '~/src/server/plugins/engine/models/index.js'
import {
  createPage,
  type PageControllerClass
} from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  type FormContext,
  type FormContextRequest,
  type FormState
} from '~/src/server/plugins/engine/types.js'
import definition from '~/test/form/definitions/repeat-mixed.js'

const basePath = `${FORM_PREFIX}/test`

describe('SummaryViewModel', () => {
  const itemId1 = 'abc-123'
  const itemId2 = 'xyz-987'

  let model: FormModel
  let page: PageControllerClass
  let pageUrl: URL
  let request: FormContextRequest
  let context: FormContext
  let summaryViewModel: SummaryViewModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: `${FORM_PREFIX}/test`
    })

    page = createPage(model, definition.pages[2])
    pageUrl = new URL('http://example.com/repeat/pizza-order/summary')

    request = {
      method: 'get',
      url: pageUrl,
      path: pageUrl.pathname,
      params: {
        path: 'pizza-order',
        slug: 'repeat'
      },
      query: {},
      app: { model }
    }
  })

  describe.each([
    {
      description: '0 items',
      state: {
        orderType: 'collection',
        pizza: []
      } satisfies FormState,
      keys: ['How would you like to receive your pizza?', 'Pizzas'],
      values: ['Collection', 'Not supplied']
    },
    {
      description: '1 item',
      state: {
        orderType: 'delivery',
        pizza: [
          {
            toppings: 'Ham',
            quantity: 2,
            itemId: itemId1
          }
        ]
      } satisfies FormState,
      keys: ['How would you like to receive your pizza?', 'Pizza added'],
      values: ['Delivery', 'You added 1 Pizza']
    },
    {
      description: '2 items',
      state: {
        orderType: 'delivery',
        pizza: [
          {
            toppings: 'Ham',
            quantity: 2,
            itemId: itemId1
          },
          {
            toppings: 'Pepperoni',
            quantity: 1,
            itemId: itemId2
          }
        ]
      } satisfies FormState,
      keys: ['How would you like to receive your pizza?', 'Pizzas added'],
      values: ['Delivery', 'You added 2 Pizzas']
    }
  ])('Check answers ($description)', ({ state, keys, values }) => {
    beforeEach(() => {
      context = model.getFormContext(request, state)
      summaryViewModel = new SummaryViewModel(request, page, context)
    })

    it('should add title for each section', () => {
      const [checkAnswers1, checkAnswers2] = summaryViewModel.checkAnswers

      // 1st summary list has no title
      expect(checkAnswers1).toHaveProperty('title', undefined)

      // 2nd summary list has section title
      expect(checkAnswers2).toHaveProperty('title', {
        text: 'Food'
      })
    })

    it('should add summary list for each section', () => {
      expect(summaryViewModel.checkAnswers).toHaveLength(2)

      const [checkAnswers1, checkAnswers2] = summaryViewModel.checkAnswers

      const { summaryList: summaryList1 } = checkAnswers1
      const { summaryList: summaryList2 } = checkAnswers2

      expect(summaryList1).toHaveProperty('rows', [
        {
          key: {
            text: keys[0]
          },
          value: {
            classes: 'app-prose-scope',
            html: values[0]
          },
          actions: {
            items: [
              {
                classes: 'govuk-link--no-visited-state',
                href: `${basePath}/delivery-or-collection?returnUrl=${encodeURIComponent(`${basePath}/summary`)}`,
                text: 'Change',
                visuallyHiddenText: keys[0]
              }
            ]
          }
        }
      ])

      expect(summaryList2).toHaveProperty('rows', [
        {
          key: {
            text: keys[1]
          },
          value: {
            classes: 'app-prose-scope',
            html: values[1]
          },
          actions: {
            items: [
              {
                classes: 'govuk-link--no-visited-state',
                href: `${basePath}/pizza-order/summary?returnUrl=${encodeURIComponent(`${basePath}/summary`)}`,
                text: 'Change',
                visuallyHiddenText: 'Pizza'
              }
            ]
          }
        }
      ])
    })

    it('should add summary list for each section (preview URL direct access)', () => {
      request.query.force = '' // Preview URL '?force'
      context = model.getFormContext(request, state)
      summaryViewModel = new SummaryViewModel(request, page, context)

      expect(summaryViewModel.checkAnswers).toHaveLength(2)

      const [checkAnswers1, checkAnswers2] = summaryViewModel.checkAnswers

      const { summaryList: summaryList1 } = checkAnswers1
      const { summaryList: summaryList2 } = checkAnswers2

      expect(summaryList1).toHaveProperty('rows', [
        {
          key: {
            text: keys[0]
          },
          value: {
            classes: 'app-prose-scope',
            html: values[0]
          },
          actions: {
            items: []
          }
        }
      ])

      expect(summaryList2).toHaveProperty('rows', [
        {
          key: {
            text: keys[1]
          },
          value: {
            classes: 'app-prose-scope',
            html: values[1]
          },
          actions: {
            items: []
          }
        }
      ])
    })
  })
})
