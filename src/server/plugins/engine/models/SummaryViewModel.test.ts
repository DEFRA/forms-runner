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

const basePath = '/test'

describe('SummaryViewModel', () => {
  const itemId1 = 'abc-123'
  const itemId2 = 'xyz-987'

  let model: FormModel
  let state: FormState
  let page: PageControllerClass
  let pageUrl: URL
  let request: FormContextRequest
  let context: FormContext
  let summaryViewModel: SummaryViewModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })

    state = {
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
    }

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

    context = model.getFormContext(request, state)
    summaryViewModel = new SummaryViewModel(request, page, context)
  })

  describe('Check answers', () => {
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
            text: 'How would you like to receive your pizza?'
          },
          value: {
            classes: 'app-prose-scope',
            html: 'Delivery'
          },
          actions: {
            items: [
              {
                classes: 'govuk-link--no-visited-state',
                href: `${basePath}/delivery-or-collection?returnUrl=${encodeURIComponent(`${basePath}/summary`)}`,
                text: 'Change',
                visuallyHiddenText: 'How would you like to receive your pizza?'
              }
            ]
          }
        }
      ])

      expect(summaryList2).toHaveProperty('rows', [
        {
          key: {
            text: 'Pizzas added'
          },
          value: {
            classes: 'app-prose-scope',
            html: 'You added 2 Pizzas'
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
            text: 'How would you like to receive your pizza?'
          },
          value: {
            classes: 'app-prose-scope',
            html: 'Delivery'
          },
          actions: {
            items: []
          }
        }
      ])

      expect(summaryList2).toHaveProperty('rows', [
        {
          key: {
            text: 'Pizzas added'
          },
          value: {
            classes: 'app-prose-scope',
            html: 'You added 2 Pizzas'
          },
          actions: {
            items: []
          }
        }
      ])
    })
  })
})
