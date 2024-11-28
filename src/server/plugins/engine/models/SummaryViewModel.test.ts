import {
  FormModel,
  SummaryViewModel
} from '~/src/server/plugins/engine/models/index.js'
import { type FormRequest } from '~/src/server/routes/types.js'
import definition from '~/test/form/definitions/repeat-mixed.js'

describe('SummaryViewModel', () => {
  const itemId1 = 'abc-123'
  const itemId2 = 'xyz-987'

  let summaryViewModel: SummaryViewModel

  beforeEach(() => {
    const model = new FormModel(definition, {
      basePath: 'test'
    })

    const relevantState = {
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

    const submissionState = {
      progress: [
        'repeat/delivery-or-collection',
        `repeat/pizza-order/${itemId1}`,
        `repeat/pizza-order/${itemId2}`,
        'repeat/summary'
      ],
      ...relevantState
    }

    const request = {
      url: new URL('http://example.com/repeat/pizza-order/summary'),
      params: {
        path: 'pizza-order',
        slug: 'repeat'
      },
      query: {}
    } as FormRequest

    summaryViewModel = new SummaryViewModel(
      'Summary',
      model,
      submissionState,
      relevantState,
      request
    )
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
            html: 'Delivery'
          },
          actions: {
            items: [
              {
                classes: 'govuk-link--no-visited-state',
                href: '/test/delivery-or-collection?returnUrl=%2Ftest%2Fsummary',
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
            html: 'You added 2 Pizzas'
          },
          actions: {
            items: [
              {
                classes: 'govuk-link--no-visited-state',
                href: '/test/pizza-order/summary?returnUrl=%2Ftest%2Fsummary',
                text: 'Change',
                visuallyHiddenText: 'Pizza'
              }
            ]
          }
        }
      ])
    })
  })
})