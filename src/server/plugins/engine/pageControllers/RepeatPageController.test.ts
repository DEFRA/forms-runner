import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import {
  type FormContextRequest,
  type FormPageViewModel,
  type FormSubmissionError,
  type RepeatListState,
  type RepeaterSummaryPageViewModel
} from '~/src/server/plugins/engine/types.js'
import definition from '~/test/form/definitions/repeat.js'

describe('RepeatPageController', () => {
  const itemId1 = 'abc-123'
  const itemId2 = 'xyz-987'

  let pageUrl: URL
  let pageItemUrl: URL
  let pageSummaryUrl: URL

  let model: FormModel
  let controller: RepeatPageController
  let requestPage: FormContextRequest
  let requestPageItem: FormContextRequest
  let requestPageSummary: FormContextRequest

  beforeEach(() => {
    const { pages } = definition

    pageUrl = new URL('/repeat/pizza-order', 'http://example.com')

    pageItemUrl = new URL(
      `${pageUrl.pathname}/${itemId1}`,
      'http://example.com'
    )

    pageSummaryUrl = new URL(
      `${pageUrl.pathname}/summary`,
      'http://example.com'
    )

    model = new FormModel(definition, {
      basePath: 'test'
    })

    controller = new RepeatPageController(model, pages[0])

    requestPage = {
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

    requestPageItem = {
      method: 'get',
      url: pageItemUrl,
      path: pageItemUrl.pathname,
      params: {
        path: 'pizza-order',
        slug: 'repeat',
        itemId: itemId1
      },
      query: {},
      app: { model }
    }

    requestPageSummary = {
      method: 'get',
      url: pageSummaryUrl,
      path: pageSummaryUrl.pathname,
      params: {
        path: 'pizza-order',
        slug: 'repeat'
      },
      query: {},
      app: { model }
    }
  })

  describe('Properties', () => {
    it('returns summary view name', () => {
      expect(controller).toHaveProperty(
        'listSummaryViewName',
        'repeat-list-summary'
      )
    })

    it('returns delete view name', () => {
      expect(controller).toHaveProperty('listDeleteViewName', 'item-delete')
    })

    it('returns repeater config', () => {
      expect(controller).toHaveProperty('repeat', {
        options: {
          name: 'pizza',
          title: 'Pizza'
        },
        schema: {
          max: 3,
          min: 2
        }
      })
    })
  })

  describe('Path methods', () => {
    describe('Summary path', () => {
      it('returns path to summary page', () => {
        expect(controller.getSummaryPath()).toBe('/summary')
      })

      it('returns path to repeater summary page', () => {
        expect(controller.getSummaryPath(requestPage)).toBe(
          '/pizza-order/summary'
        )
      })
    })
  })

  describe('Item view model', () => {
    let viewModel: FormPageViewModel

    beforeEach(() => {
      viewModel = controller.getViewModel(
        requestPageItem,
        model.getFormContext(requestPageItem, {})
      )
    })

    it('updates section title with repeater title and count', () => {
      expect(viewModel).toHaveProperty('sectionTitle', 'Food: Pizza 1')
    })
  })

  describe.each([
    {
      description: 'No items',
      list: [] satisfies RepeatListState,
      viewModel: {
        pageTitle: 'You have added 0 Pizzas',
        showTitle: true,
        sectionTitle: 'Food'
      }
    },
    {
      description: '1 item',
      list: [
        {
          itemId: itemId1,
          toppings: 'Ham',
          quantity: 2
        }
      ] satisfies RepeatListState,
      viewModel: {
        pageTitle: 'You have added 1 Pizza',
        showTitle: true,
        sectionTitle: 'Food'
      }
    },
    {
      description: '2 items',
      list: [
        {
          itemId: itemId1,
          toppings: 'Ham',
          quantity: 2
        },
        {
          itemId: itemId2,
          toppings: 'Cheese',
          quantity: 1
        }
      ] satisfies RepeatListState,
      viewModel: {
        pageTitle: 'You have added 2 Pizzas',
        showTitle: true,
        sectionTitle: 'Food'
      }
    }
  ])(
    'List summary view model ($description)',
    ({ list, viewModel: expected }) => {
      let viewModel: RepeaterSummaryPageViewModel

      beforeEach(() => {
        viewModel = controller.getListSummaryViewModel(
          requestPageSummary,
          model.getFormContext(requestPageSummary, {}),
          list
        )
      })

      it('should customise page title', () => {
        expect(viewModel).toHaveProperty('pageTitle', expected.pageTitle)
        expect(viewModel).toHaveProperty('showTitle', expected.showTitle)
      })

      it('should extend default view model', () => {
        const defaults = controller.viewModel

        expect(viewModel).toHaveProperty('name', defaults.name)
        expect(viewModel).toHaveProperty('page', defaults.page)
        expect(viewModel).toHaveProperty('sectionTitle', expected.sectionTitle)
        expect(viewModel).toHaveProperty('isStartPage', defaults.isStartPage)
        expect(viewModel).toHaveProperty('serviceUrl', defaults.serviceUrl)
        expect(viewModel).toHaveProperty('feedbackLink', defaults.feedbackLink)

        // Unless overridden
        expect(viewModel).not.toHaveProperty('pageTitle', defaults.pageTitle)
      })
    }
  )

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
            label: 'Toppings',
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
            label: 'Quantity',
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
