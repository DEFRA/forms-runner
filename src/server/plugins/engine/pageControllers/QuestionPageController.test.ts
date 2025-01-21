import { type PageQuestion } from '@defra/forms-model'
import { type ResponseToolkit } from '@hapi/hapi'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import {
  type FormContext,
  type FormContextRequest,
  type FormPageViewModel,
  type FormState,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import { type FormRequest } from '~/src/server/routes/types.js'
import { CacheService } from '~/src/server/services/cacheService.js'
import definitionConditionsBasic, {
  V2 as definitionConditionsBasicV2
} from '~/test/form/definitions/conditions-basic.js'
import definitionConditionsComplex from '~/test/form/definitions/conditions-complex.js'
import definitionConditionsDates from '~/test/form/definitions/conditions-dates.js'

describe('QuestionPageController', () => {
  let page1: PageQuestion
  let page1Url: URL

  let page2: PageQuestion
  let page2Url: URL

  let model: FormModel
  let controller1: QuestionPageController
  let controller2: QuestionPageController
  let requestPage1: FormRequest
  let requestPage2: FormRequest

  beforeEach(() => {
    const { pages } = definitionConditionsBasic

    page1 = pages[0]
    page1Url = new URL('http://example.com/test/first-page')

    page2 = pages[1]
    page2Url = new URL('http://example.com/test/second-page')

    model = new FormModel(definitionConditionsBasic, {
      basePath: 'test'
    })

    controller1 = new QuestionPageController(model, page1)
    controller2 = new QuestionPageController(model, page2)

    requestPage1 = {
      method: 'get',
      url: page1Url,
      path: page1Url.pathname,
      params: {
        path: 'first-page',
        slug: 'test'
      },
      query: {},
      app: { model }
    } as FormRequest

    requestPage2 = {
      method: 'get',
      url: page2Url,
      path: page2Url.pathname,
      params: {
        path: 'second-page',
        slug: 'test'
      },
      query: {},
      app: { model }
    } as FormRequest
  })

  describe('Properties', () => {
    it('returns path', () => {
      expect(controller1).toHaveProperty('path', '/first-page')
      expect(controller2).toHaveProperty('path', '/second-page')
    })

    it('returns href', () => {
      expect(controller1).toHaveProperty('href', '/test/first-page')
      expect(controller2).toHaveProperty('href', '/test/second-page')
    })

    it('returns keys', () => {
      expect(controller1).toHaveProperty('keys', ['yesNoField'])
      expect(controller2).toHaveProperty('keys', [
        'dateField',
        'dateField__day',
        'dateField__month',
        'dateField__year',
        'multilineTextField'
      ])
    })

    it('returns the page section', () => {
      expect(controller1).toHaveProperty('section', undefined)
      expect(controller2).toHaveProperty('section', {
        name: 'marriage',
        title: 'Your marriage',
        hideTitle: false
      })
    })
  })

  describe('Path methods', () => {
    describe('Next getter', () => {
      it('returns page links', () => {
        expect(controller1).toHaveProperty('next', [
          { path: '/second-page' },
          { path: '/summary', condition: 'isPreviouslyMarried' }
        ])

        expect(controller2).toHaveProperty('next', [{ path: '/summary' }])
      })

      it('returns page links (none found)', () => {
        const pageDef1 = structuredClone(controller1.pageDef)
        const pageDef2 = structuredClone(controller2.pageDef)

        controller1.pageDef = pageDef1
        controller2.pageDef = pageDef2

        // @ts-expect-error - Allow invalid property for test
        controller1.pageDef.next = []

        // @ts-expect-error - Allow invalid property for test
        delete controller2.pageDef.next

        expect(controller1).toHaveProperty('next', [])
        expect(controller2).toHaveProperty('next', [])
      })
    })
  })

  describe('Component collection', () => {
    it('returns the components for the page', () => {
      const { components: components1 } = controller1.collection
      const { components: components2 } = controller2.collection

      expect(components1).toHaveLength(1)
      expect(components1[0].name).toBe('yesNoField')

      expect(components2).toHaveLength(3)
      expect(components2[0].name).toBe('detailsField')
      expect(components2[1].name).toBe('dateField')
      expect(components2[2].name).toBe('multilineTextField')
    })

    it('returns the fields for the page', () => {
      const { fields: fields1 } = controller1.collection
      const { fields: fields2 } = controller2.collection

      expect(fields1).toHaveLength(1)
      expect(fields1[0].name).toBe('yesNoField')

      expect(fields2).toHaveLength(2)
      expect(fields2[0].name).toBe('dateField')
      expect(fields2[1].name).toBe('multilineTextField')
    })

    it('returns the guidance for the page', () => {
      const { guidance: guidance1 } = controller1.collection
      const { guidance: guidance2 } = controller2.collection

      expect(guidance1).toHaveLength(0)
      expect(guidance2).toHaveLength(1)
      expect(guidance2[0].name).toBe('detailsField')
    })
  })

  describe('Component view models', () => {
    let viewModel1: FormPageViewModel
    let viewModel2: FormPageViewModel

    beforeEach(() => {
      viewModel1 = controller1.getViewModel(
        requestPage1,
        model.getFormContext(requestPage1, {})
      )

      viewModel2 = controller2.getViewModel(
        requestPage2,
        model.getFormContext(requestPage2, {})
      )
    })

    it('hides the page title for single form component pages', () => {
      // Page 1 hides page title (single component)
      expect(viewModel1).toHaveProperty('showTitle', false)
      expect(viewModel1).toHaveProperty('pageTitle', 'Previous marriages')

      // Page 2 shows page title (multiple components)
      expect(viewModel2).toHaveProperty('showTitle', true)
      expect(viewModel2).toHaveProperty(
        'pageTitle',
        'When will you get married?'
      )
    })

    it('returns the component view models for the page', () => {
      const { components: components1 } = viewModel1
      const { components: components2 } = viewModel2

      expect(components1).toHaveLength(1)
      expect(components2).toHaveLength(3)

      // Page 1, component 1, default label
      expect(components1[0].model).toHaveProperty('label', {
        text: 'Have you previously been married?'
      })

      // Page 1, component 1, optional legend
      expect(components1[0].model).toHaveProperty('fieldset', {
        legend: {
          text: 'Previous marriages',
          classes: 'govuk-fieldset__legend--l',
          isPageHeading: true
        }
      })

      // Page 2, component 1, content only
      expect(components2[0].model).toEqual({
        attributes: {},
        summaryHtml: 'Find out more',
        html: 'Some content goes here'
      })

      // Page 2, component 2, default label
      expect(components2[1].model).toHaveProperty('label', {
        text: 'Date of marriage'
      })

      // Page 2, component 2, optional legend
      expect(components2[1].model).toHaveProperty('fieldset', {
        legend: {
          text: 'Date of marriage',
          classes: 'govuk-fieldset__legend--m'
        }
      })

      // Page 2, component 3, default label
      expect(components2[2].model).toHaveProperty('label', {
        text: 'Remarks'
      })

      // Page 2, component 3, optional legend
      expect(components2[2].model).not.toHaveProperty('fieldset')
    })
  })

  describe('Condition evaluation context', () => {
    it('filters state by journey pages', () => {
      const { pages } = definitionConditionsComplex

      const model = new FormModel(definitionConditionsComplex, {
        basePath: 'test'
      })

      // Selected page appears after convergence and contains a conditional field
      // This is the page we're theoretically browsing to
      const controller = new QuestionPageController(model, pages[7])

      // The state below shows we said we had a UKPassport and entered details for an applicant
      const state: FormSubmissionState = {
        ukPassport: true,
        numberOfApplicants: 2,
        applicantOneFirstName: 'Enrique',
        applicantOneMiddleName: null,
        applicantOneLastName: 'Chase',
        applicantOneAddress__addressLine1: 'AddressLine1',
        applicantOneAddress__addressLine2: 'AddressLine2',
        applicantOneAddress__town: 'Town',
        applicantOneAddress__postcode: 'Postcode',
        applicantTwoFirstName: 'John',
        applicantTwoMiddleName: null,
        applicantTwoLastName: 'Doe',
        applicantTwoAddress__addressLine1: 'AddressLine1',
        applicantTwoAddress__addressLine2: 'AddressLine2',
        applicantTwoAddress__town: 'Town',
        applicantTwoAddress__postcode: 'Postcode'
      }

      let request = {
        method: 'get',
        url: new URL('http://example.com/test/applicant-one-address'),
        path: '/test/applicant-one-address',
        params: {
          path: 'applicant-one-address',
          slug: 'test'
        },
        query: {},
        app: { model }
      } satisfies FormContextRequest

      // Calculate our context based on the page we're attempting to load and the above state we provide
      let context = controller.model.getFormContext(request, state)
      const { evaluationState: stateBefore } = context

      // Our context should know our first applicant
      expect(stateBefore).toEqual({
        numberOfApplicants: 2,
        ukPassport: true,
        applicantOneFirstName: 'Enrique',
        applicantOneMiddleName: null,
        applicantOneLastName: 'Chase',
        applicantOneAddress: [
          'AddressLine1',
          'AddressLine2',
          'Town',
          'Postcode'
        ]
      })

      // Our context should know which pages are relevant
      expect(context.paths).toEqual([
        '/uk-passport',
        '/how-many-people',
        '/applicant-one-name',
        '/applicant-one-address'
      ])

      // Now mark that we don't have a UK Passport
      state.ukPassport = false

      request = {
        method: 'get',
        url: new URL('http://example.com/test/summary'),
        path: '/test/summary',
        params: {
          path: 'summary',
          slug: 'test'
        },
        query: {},
        app: { model }
      } satisfies FormContextRequest

      // And recalculate our context
      context = controller.model.getFormContext(request, state)
      const { evaluationState: stateAfter } = context

      // Our context should no longer list pages about our applicant
      expect(context.paths).toEqual([
        '/uk-passport',
        '/testconditions',
        '/summary'
      ])

      // Our context should no longer know anything about our applicant
      expect(stateAfter).not.toHaveProperty('numberOfApplicants')
      expect(stateAfter).not.toHaveProperty('applicantOneFirstName')
      expect(stateAfter).not.toHaveProperty('applicantOneMiddleName')
      expect(stateAfter).not.toHaveProperty('applicantOneLastName')
      expect(stateAfter).not.toHaveProperty('applicantOneAddress')

      expect(stateAfter).toEqual({
        ukPassport: false
      })
    })

    it('combines state values for date fields', () => {
      const { pages } = definitionConditionsDates

      const model = new FormModel(definitionConditionsDates, {
        basePath: 'test'
      })

      const controller = new QuestionPageController(model, pages[0])

      const request = {
        method: 'get',
        url: new URL('http://example.com/test/page-one'),
        path: '/test/page-one',
        params: {
          path: 'page-one',
          slug: 'test'
        },
        query: {},
        app: { model }
      } satisfies FormContextRequest

      const context = controller.model.getFormContext(request, {
        dateField__day: 5,
        dateField__month: 1,
        dateField__year: 2024
      })

      // Ensure dates are transformed to yyyy-MM-dd format
      expect(context.evaluationState).toHaveProperty('dateField', '2024-01-05')

      // Unlike relevant state which has the individual date parts
      expect(context.relevantState).not.toHaveProperty('dateField')
      expect(context.relevantState).toMatchObject({
        dateField__day: 5,
        dateField__month: 1,
        dateField__year: 2024
      })
    })
  })

  describe('Form validation', () => {
    it('includes all field errors', () => {
      const result1 = controller1.collection.validate()
      const result2 = controller2.collection.validate()

      expect(result1.errors).toHaveLength(1)
      expect(result2.errors).toHaveLength(4)
    })
  })

  describe('Form journey', () => {
    let context: FormContext
    let contextNo: FormContext
    let contextYes: FormContext

    beforeEach(() => {
      // Empty state
      context = model.getFormContext(requestPage1, {})

      // Question 1: Selected 'No'
      contextNo = model.getFormContext(requestPage1, {
        yesNoField: false
      })

      // Question 1: Selected 'Yes'
      contextYes = model.getFormContext(requestPage1, {
        yesNoField: true
      })
    })

    describe('Next getter', () => {
      it('returns the next page links', () => {
        expect(controller1).toHaveProperty('next', [
          { path: '/second-page' },
          { path: '/summary', condition: 'isPreviouslyMarried' }
        ])

        expect(controller2).toHaveProperty('next', [{ path: '/summary' }])
      })
    })

    describe('Next', () => {
      it('returns the next page path', () => {
        expect(controller1.getNextPath(context)).toBe('/second-page')
        expect(controller1.getNextPath(contextNo)).toBe('/second-page')
        expect(controller1.getNextPath(contextYes)).toBe('/summary')

        expect(controller2.getNextPath(context)).toBe('/summary')
        expect(controller2.getNextPath(contextNo)).toBe('/summary')
        expect(controller2.getNextPath(contextYes)).toBe('/summary')
      })
    })

    describe('Summary', () => {
      it('returns the summary path', () => {
        expect(controller1.getSummaryPath()).toBe('/summary')
        expect(controller2.getSummaryPath()).toBe('/summary')
      })
    })
  })

  describe('Route handlers', () => {
    const response = {
      code: jest.fn().mockImplementation(() => response)
    }

    const h: Pick<ResponseToolkit, 'redirect' | 'view'> = {
      redirect: jest.fn().mockReturnValue(response),
      view: jest.fn()
    }

    it('returns default route options', () => {
      expect(controller1.getRouteOptions).toMatchObject({
        ext: {
          onPostHandler: {
            method: expect.any(Function)
          }
        }
      })

      expect(controller1.postRouteOptions).toMatchObject({
        ext: {
          onPostHandler: {
            method: expect.any(Function)
          }
        }
      })
    })

    it('supports GET route handler', async () => {
      const state: FormState = { yesNoField: false }

      for (const controller of [controller1, controller2]) {
        jest
          .spyOn(controller, 'hasMissingNotificationEmail')
          .mockResolvedValue(false)

        jest.spyOn(controller, 'getState').mockResolvedValue(state)
      }

      expect(() => controller1.makeGetRouteHandler()).not.toThrow()
      expect(() => controller1.makeGetRouteHandler()).toBeInstanceOf(Function)

      await controller1.makeGetRouteHandler()(
        requestPage1,
        model.getFormContext(requestPage1, {}),
        h
      )

      await controller2.makeGetRouteHandler()(
        requestPage2,
        model.getFormContext(requestPage2, {}),
        h
      )

      expect(h.view).toHaveBeenNthCalledWith(
        1,
        controller1.viewName,
        expect.objectContaining({
          pageTitle: 'Previous marriages',
          sectionTitle: undefined
        })
      )

      expect(h.view).toHaveBeenNthCalledWith(
        2,
        controller2.viewName,
        expect.objectContaining({
          pageTitle: 'When will you get married?',
          sectionTitle: 'Your marriage'
        })
      )
    })
  })

  describe('State', () => {
    beforeEach(() => {
      jest.spyOn(CacheService.prototype, 'getState')
      jest.spyOn(CacheService.prototype, 'setState')

      // Preview URL '?force'
      requestPage1.query.force = ''
    })

    describe('getState', () => {
      it('should skip get for preview URL direct access', async () => {
        const state = await controller1.getState(requestPage1)

        expect(state).toEqual({})
        expect(CacheService.prototype.getState).not.toHaveBeenCalled()
      })
    })

    describe('setState', () => {
      it('should skip set for preview URL direct access', async () => {
        const state: FormSubmissionState = { yesNoField: false }
        const updated = await controller1.setState(requestPage1, state)

        expect(updated).toBe(state)
        expect(CacheService.prototype.setState).not.toHaveBeenCalled()
      })
    })

    describe('mergeState', () => {
      it('should skip merge for preview URL direct access', async () => {
        const state: FormSubmissionState = {
          yesNoField: false
        }

        const update: FormSubmissionState = {
          dateField__day: 5,
          dateField__month: 1,
          dateField__year: 2024
        }

        const updated = await controller1.mergeState(
          requestPage1,
          state,
          update
        )

        expect(updated).toEqual({
          yesNoField: false,
          dateField__day: 5,
          dateField__month: 1,
          dateField__year: 2024
        })

        expect(CacheService.prototype.setState).not.toHaveBeenCalled()
      })
    })
  })
})

describe('QuestionPageController V2', () => {
  let page1Url: URL
  let page2Url: URL

  let model: FormModel
  let controller1: QuestionPageController
  let controller2: QuestionPageController
  let requestPage1: FormRequest
  let requestPage2: FormRequest

  beforeEach(() => {
    page1Url = new URL('http://example.com/test/first-page')
    page2Url = new URL('http://example.com/test/second-page')

    model = new FormModel(definitionConditionsBasicV2, {
      basePath: 'test'
    })

    controller1 = model.pages[0] // new QuestionPageController(model, page1)
    controller2 = model.pages[1] // new QuestionPageController(model, page2)

    requestPage1 = {
      method: 'get',
      url: page1Url,
      path: page1Url.pathname,
      params: {
        path: 'first-page',
        slug: 'test'
      },
      query: {},
      app: { model }
    } as FormRequest

    requestPage2 = {
      method: 'get',
      url: page2Url,
      path: page2Url.pathname,
      params: {
        path: 'second-page',
        slug: 'test'
      },
      query: {},
      app: { model }
    } as FormRequest
  })

  describe('Properties', () => {
    it('returns path', () => {
      expect(controller1).toHaveProperty('path', '/first-page')
      expect(controller2).toHaveProperty('path', '/second-page')
    })

    it('returns href', () => {
      expect(controller1).toHaveProperty('href', '/test/first-page')
      expect(controller2).toHaveProperty('href', '/test/second-page')
    })

    it('returns keys', () => {
      expect(controller1).toHaveProperty('keys', ['yesNoField'])
      expect(controller2).toHaveProperty('keys', [
        'dateField',
        'dateField__day',
        'dateField__month',
        'dateField__year',
        'multilineTextField'
      ])
    })

    it('returns the page section', () => {
      expect(controller1).toHaveProperty('section', undefined)
      expect(controller2).toHaveProperty('section', {
        name: 'marriage',
        title: 'Your marriage',
        hideTitle: false
      })
    })
  })

  describe('Path methods', () => {
    describe('Next getter', () => {
      it('returns page links', () => {
        expect(controller1).toHaveProperty('next', [])

        expect(controller2).toHaveProperty('next', [])
      })

      it('returns page links (none found)', () => {
        const pageDef1 = structuredClone(controller1.pageDef)
        const pageDef2 = structuredClone(controller2.pageDef)

        controller1.pageDef = pageDef1
        controller2.pageDef = pageDef2

        // @ts-expect-error - Allow invalid property for test
        controller1.pageDef.next = []

        // @ts-expect-error - Allow invalid property for test
        delete controller2.pageDef.next

        expect(controller1).toHaveProperty('next', [])
        expect(controller2).toHaveProperty('next', [])
      })
    })
  })

  describe('Component collection', () => {
    it('returns the components for the page', () => {
      const { components: components1 } = controller1.collection
      const { components: components2 } = controller2.collection

      expect(components1).toHaveLength(1)
      expect(components1[0].name).toBe('yesNoField')

      expect(components2).toHaveLength(3)
      expect(components2[0].name).toBe('detailsField')
      expect(components2[1].name).toBe('dateField')
      expect(components2[2].name).toBe('multilineTextField')
    })

    it('returns the fields for the page', () => {
      const { fields: fields1 } = controller1.collection
      const { fields: fields2 } = controller2.collection

      expect(fields1).toHaveLength(1)
      expect(fields1[0].name).toBe('yesNoField')

      expect(fields2).toHaveLength(2)
      expect(fields2[0].name).toBe('dateField')
      expect(fields2[1].name).toBe('multilineTextField')
    })

    it('returns the guidance for the page', () => {
      const { guidance: guidance1 } = controller1.collection
      const { guidance: guidance2 } = controller2.collection

      expect(guidance1).toHaveLength(0)
      expect(guidance2).toHaveLength(1)
      expect(guidance2[0].name).toBe('detailsField')
    })
  })

  describe('Component view models', () => {
    let viewModel1: FormPageViewModel
    let viewModel2: FormPageViewModel

    beforeEach(() => {
      viewModel1 = controller1.getViewModel(
        requestPage1,
        model.getFormContext(requestPage1, {})
      )

      viewModel2 = controller2.getViewModel(
        requestPage2,
        model.getFormContext(requestPage2, {})
      )
    })

    it('hides the page title for single form component pages', () => {
      // Page 1 hides page title (single component)
      expect(viewModel1).toHaveProperty('showTitle', false)
      expect(viewModel1).toHaveProperty('pageTitle', 'Previous marriages')

      // Page 2 shows page title (multiple components)
      expect(viewModel2).toHaveProperty('showTitle', true)
      expect(viewModel2).toHaveProperty(
        'pageTitle',
        'When will you get married?'
      )
    })

    it('returns the component view models for the page', () => {
      const { components: components1 } = viewModel1
      const { components: components2 } = viewModel2

      expect(components1).toHaveLength(1)
      expect(components2).toHaveLength(3)

      // Page 1, component 1, default label
      expect(components1[0].model).toHaveProperty('label', {
        text: 'Have you previously been married?'
      })

      // Page 1, component 1, optional legend
      expect(components1[0].model).toHaveProperty('fieldset', {
        legend: {
          text: 'Previous marriages',
          classes: 'govuk-fieldset__legend--l',
          isPageHeading: true
        }
      })

      // Page 2, component 1, content only
      expect(components2[0].model).toEqual({
        attributes: {},
        summaryHtml: 'Find out more',
        html: 'Some content goes here'
      })

      // Page 2, component 2, default label
      expect(components2[1].model).toHaveProperty('label', {
        text: 'Date of marriage'
      })

      // Page 2, component 2, optional legend
      expect(components2[1].model).toHaveProperty('fieldset', {
        legend: {
          text: 'Date of marriage',
          classes: 'govuk-fieldset__legend--m'
        }
      })

      // Page 2, component 3, default label
      expect(components2[2].model).toHaveProperty('label', {
        text: 'Remarks'
      })

      // Page 2, component 3, optional legend
      expect(components2[2].model).not.toHaveProperty('fieldset')
    })
  })

  describe('Condition evaluation context', () => {
    it('filters state by journey pages', () => {
      const { pages } = definitionConditionsComplex

      const model = new FormModel(definitionConditionsComplex, {
        basePath: 'test'
      })

      // Selected page appears after convergence and contains a conditional field
      // This is the page we're theoretically browsing to
      const controller = new QuestionPageController(model, pages[7])

      // The state below shows we said we had a UKPassport and entered details for an applicant
      const state: FormSubmissionState = {
        ukPassport: true,
        numberOfApplicants: 2,
        applicantOneFirstName: 'Enrique',
        applicantOneMiddleName: null,
        applicantOneLastName: 'Chase',
        applicantOneAddress__addressLine1: 'AddressLine1',
        applicantOneAddress__addressLine2: 'AddressLine2',
        applicantOneAddress__town: 'Town',
        applicantOneAddress__postcode: 'Postcode',
        applicantTwoFirstName: 'John',
        applicantTwoMiddleName: null,
        applicantTwoLastName: 'Doe',
        applicantTwoAddress__addressLine1: 'AddressLine1',
        applicantTwoAddress__addressLine2: 'AddressLine2',
        applicantTwoAddress__town: 'Town',
        applicantTwoAddress__postcode: 'Postcode'
      }

      let request = {
        method: 'get',
        url: new URL('http://example.com/test/applicant-one-address'),
        path: '/test/applicant-one-address',
        params: {
          path: 'applicant-one-address',
          slug: 'test'
        },
        query: {},
        app: { model }
      } satisfies FormContextRequest

      // Calculate our context based on the page we're attempting to load and the above state we provide
      let context = controller.model.getFormContext(request, state)
      const { evaluationState: stateBefore } = context

      // Our context should know our first applicant
      expect(stateBefore).toEqual({
        numberOfApplicants: 2,
        ukPassport: true,
        applicantOneFirstName: 'Enrique',
        applicantOneMiddleName: null,
        applicantOneLastName: 'Chase',
        applicantOneAddress: [
          'AddressLine1',
          'AddressLine2',
          'Town',
          'Postcode'
        ]
      })

      // Our context should know which pages are relevant
      expect(context.paths).toEqual([
        '/uk-passport',
        '/how-many-people',
        '/applicant-one-name',
        '/applicant-one-address'
      ])

      // Now mark that we don't have a UK Passport
      state.ukPassport = false

      request = {
        method: 'get',
        url: new URL('http://example.com/test/summary'),
        path: '/test/summary',
        params: {
          path: 'summary',
          slug: 'test'
        },
        query: {},
        app: { model }
      } satisfies FormContextRequest

      // And recalculate our context
      context = controller.model.getFormContext(request, state)
      const { evaluationState: stateAfter } = context

      // Our context should no longer list pages about our applicant
      expect(context.paths).toEqual([
        '/uk-passport',
        '/testconditions',
        '/summary'
      ])

      // Our context should no longer know anything about our applicant
      expect(stateAfter).not.toHaveProperty('numberOfApplicants')
      expect(stateAfter).not.toHaveProperty('applicantOneFirstName')
      expect(stateAfter).not.toHaveProperty('applicantOneMiddleName')
      expect(stateAfter).not.toHaveProperty('applicantOneLastName')
      expect(stateAfter).not.toHaveProperty('applicantOneAddress')

      expect(stateAfter).toEqual({
        ukPassport: false
      })
    })

    it('combines state values for date fields', () => {
      const { pages } = definitionConditionsDates

      const model = new FormModel(definitionConditionsDates, {
        basePath: 'test'
      })

      const controller = new QuestionPageController(model, pages[0])

      const request = {
        method: 'get',
        url: new URL('http://example.com/test/page-one'),
        path: '/test/page-one',
        params: {
          path: 'page-one',
          slug: 'test'
        },
        query: {},
        app: { model }
      } satisfies FormContextRequest

      const context = controller.model.getFormContext(request, {
        dateField__day: 5,
        dateField__month: 1,
        dateField__year: 2024
      })

      // Ensure dates are transformed to yyyy-MM-dd format
      expect(context.evaluationState).toHaveProperty('dateField', '2024-01-05')

      // Unlike relevant state which has the individual date parts
      expect(context.relevantState).not.toHaveProperty('dateField')
      expect(context.relevantState).toMatchObject({
        dateField__day: 5,
        dateField__month: 1,
        dateField__year: 2024
      })
    })
  })

  describe('Form validation', () => {
    it('includes all field errors', () => {
      const result1 = controller1.collection.validate()
      const result2 = controller2.collection.validate()

      expect(result1.errors).toHaveLength(1)
      expect(result2.errors).toHaveLength(4)
    })
  })

  describe('Form journey', () => {
    let context: FormContext
    let contextNo: FormContext
    let contextYes: FormContext

    beforeEach(() => {
      // Empty state
      context = model.getFormContext(requestPage1, {})

      // Question 1: Selected 'No'
      contextNo = model.getFormContext(requestPage1, {
        yesNoField: false
      })

      // Question 1: Selected 'Yes'
      contextYes = model.getFormContext(requestPage1, {
        yesNoField: true
      })
    })

    describe('Next', () => {
      it('returns the next page path', () => {
        expect(controller1.getNextPath(context)).toBe('/summary')
        expect(controller1.getNextPath(contextNo)).toBe('/second-page')
        expect(controller1.getNextPath(contextYes)).toBe('/summary')

        expect(controller2.getNextPath(context)).toBe('/summary')
        expect(controller2.getNextPath(contextNo)).toBe('/summary')
        expect(controller2.getNextPath(contextYes)).toBe('/summary')
      })
    })

    describe('Summary', () => {
      it('returns the summary path', () => {
        expect(controller1.getSummaryPath()).toBe('/summary')
        expect(controller2.getSummaryPath()).toBe('/summary')
      })
    })
  })

  describe('Route handlers', () => {
    const response = {
      code: jest.fn().mockImplementation(() => response)
    }

    const h: Pick<ResponseToolkit, 'redirect' | 'view'> = {
      redirect: jest.fn().mockReturnValue(response),
      view: jest.fn()
    }

    it('returns default route options', () => {
      expect(controller1.getRouteOptions).toMatchObject({
        ext: {
          onPostHandler: {
            method: expect.any(Function)
          }
        }
      })

      expect(controller1.postRouteOptions).toMatchObject({
        ext: {
          onPostHandler: {
            method: expect.any(Function)
          }
        }
      })
    })

    it('supports GET route handler', async () => {
      const state: FormState = { yesNoField: false }

      for (const controller of [controller1, controller2]) {
        jest
          .spyOn(controller, 'hasMissingNotificationEmail')
          .mockResolvedValue(false)

        jest.spyOn(controller, 'getState').mockResolvedValue(state)
      }

      expect(() => controller1.makeGetRouteHandler()).not.toThrow()
      expect(() => controller1.makeGetRouteHandler()).toBeInstanceOf(Function)

      await controller1.makeGetRouteHandler()(
        requestPage1,
        model.getFormContext(requestPage1, {}),
        h
      )

      await controller2.makeGetRouteHandler()(
        requestPage2,
        model.getFormContext(requestPage2, {}),
        h
      )

      expect(h.view).toHaveBeenNthCalledWith(
        1,
        controller1.viewName,
        expect.objectContaining({
          pageTitle: 'Previous marriages',
          sectionTitle: undefined
        })
      )

      expect(h.view).toHaveBeenNthCalledWith(
        2,
        controller2.viewName,
        expect.objectContaining({
          pageTitle: 'When will you get married?',
          sectionTitle: 'Your marriage'
        })
      )
    })
  })

  describe('State', () => {
    beforeEach(() => {
      jest.spyOn(CacheService.prototype, 'getState')
      jest.spyOn(CacheService.prototype, 'setState')

      // Preview URL '?force'
      requestPage1.query.force = ''
    })

    describe('getState', () => {
      it('should skip get for preview URL direct access', async () => {
        const state = await controller1.getState(requestPage1)

        expect(state).toEqual({})
        expect(CacheService.prototype.getState).not.toHaveBeenCalled()
      })
    })

    describe('setState', () => {
      it('should skip set for preview URL direct access', async () => {
        const state: FormSubmissionState = { yesNoField: false }
        const updated = await controller1.setState(requestPage1, state)

        expect(updated).toBe(state)
        expect(CacheService.prototype.setState).not.toHaveBeenCalled()
      })
    })

    describe('mergeState', () => {
      it('should skip merge for preview URL direct access', async () => {
        const state: FormSubmissionState = {
          yesNoField: false
        }

        const update: FormSubmissionState = {
          dateField__day: 5,
          dateField__month: 1,
          dateField__year: 2024
        }

        const updated = await controller1.mergeState(
          requestPage1,
          state,
          update
        )

        expect(updated).toEqual({
          yesNoField: false,
          dateField__day: 5,
          dateField__month: 1,
          dateField__year: 2024
        })

        expect(CacheService.prototype.setState).not.toHaveBeenCalled()
      })
    })
  })
})
