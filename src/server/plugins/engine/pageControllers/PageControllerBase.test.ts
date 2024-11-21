import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { PageControllerBase } from '~/src/server/plugins/engine/pageControllers/PageControllerBase.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'
import definitionConditionsBasic from '~/test/form/definitions/conditions-basic.js'
import definitionConditionsComplex from '~/test/form/definitions/conditions-complex.js'
import definitionConditionsDates from '~/test/form/definitions/conditions-dates.js'

describe('PageControllerBase', () => {
  let controller1: PageControllerBase
  let controller2: PageControllerBase

  beforeEach(() => {
    const { pages } = definitionConditionsBasic

    const model = new FormModel(definitionConditionsBasic, {
      basePath: 'test'
    })

    controller1 = new PageControllerBase(model, pages[0])
    controller2 = new PageControllerBase(model, pages[1])
  })

  describe('Component collection', () => {
    it('returns the components for the page', () => {
      const { components: components1 } = controller1.collection
      const { components: components2 } = controller2.collection

      expect(components1).toHaveLength(1)
      expect(components1[0].name).toBe('yesNoField')

      expect(components2).toHaveLength(2)
      expect(components2[0].name).toBe('dateField')
      expect(components2[1].name).toBe('detailsField')
    })

    it('returns the fields for the page', () => {
      const { fields: fields1 } = controller1.collection
      const { fields: fields2 } = controller2.collection

      expect(fields1).toHaveLength(1)
      expect(fields1[0].name).toBe('yesNoField')

      expect(fields2).toHaveLength(1)
      expect(fields2[0].name).toBe('dateField')
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
      const controller = new PageControllerBase(model, pages[7])

      // The state below shows we said we had a UKPassport and entered details for an applicant
      const state: FormSubmissionState = {
        progress: [
          '/csds/uk-passport',
          '/csds/how-many-people',
          '/csds/applicant-one',
          '/csds/applicant-one-address',
          '/csds/contact-details'
        ],
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

      // Calculate our context based on the page we're attempting to load and the above state we provide
      let context = controller.getConditionEvaluationContext(model, state)

      // Our context should know our first applicant
      expect(context).toEqual({
        numberOfApplicants: 2,
        ukPassport: true,
        applicantOneFirstName: 'Enrique',
        applicantOneMiddleName: null,
        applicantOneLastName: 'Chase',
        applicantOneAddress: {
          addressLine1: 'AddressLine1',
          addressLine2: 'AddressLine2',
          town: 'Town',
          postcode: 'Postcode'
        }
      })

      // Now mark that we don't have a UK Passport
      state.ukPassport = false

      // And recalculate our context
      context = controller.getConditionEvaluationContext(model, state)

      // Our context should no longer know anything about our applicant
      expect(context).not.toHaveProperty('numberOfApplicants')
      expect(context).not.toHaveProperty('applicantOneFirstName')
      expect(context).not.toHaveProperty('applicantOneMiddleName')
      expect(context).not.toHaveProperty('applicantOneLastName')
      expect(context).not.toHaveProperty('applicantOneAddress')

      expect(context).toEqual({
        ukPassport: false
      })
    })

    it('combines state values for date fields', () => {
      const { pages } = definitionConditionsDates

      const model = new FormModel(definitionConditionsDates, {
        basePath: 'test'
      })

      const controller = new PageControllerBase(model, pages[0])
      const context = controller.getConditionEvaluationContext(model, {
        progress: [],
        dateField__day: 5,
        dateField__month: 1,
        dateField__year: 2024
      })

      // Ensure dates are transformed to yyyy-MM-dd format
      expect(context).toHaveProperty('dateField', '2024-01-05')
    })
  })

  describe('Form validation', () => {
    it('includes all field errors', () => {
      const result1 = controller1.collection.validate()
      const result2 = controller2.collection.validate()

      expect(result1.errors).toHaveLength(1)
      expect(result2.errors).toHaveLength(3)
    })
  })

  describe('Form journey', () => {
    let state: FormSubmissionState
    let stateNo: FormSubmissionState
    let stateYes: FormSubmissionState

    beforeEach(() => {
      state = {}

      stateNo = {
        yesNoField: false
      }

      stateYes = {
        yesNoField: true
      }
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

    describe('Next page', () => {
      it('returns the next page', () => {
        expect(controller1.getNextPage(state)).toMatchObject({
          path: '/second-page'
        })

        expect(controller1.getNextPage(stateNo)).toMatchObject({
          path: '/second-page'
        })

        expect(controller1.getNextPage(stateYes)).toMatchObject({
          path: '/summary'
        })

        expect(controller2.getNextPage(state)).toMatchObject({
          path: '/summary'
        })

        expect(controller2.getNextPage(stateNo)).toMatchObject({
          path: '/summary'
        })

        expect(controller2.getNextPage(stateYes)).toMatchObject({
          path: '/summary'
        })
      })
    })

    describe('Next', () => {
      it('returns the next page path', () => {
        expect(controller1.getNext(state)).toBe('/test/second-page')
        expect(controller1.getNext(stateNo)).toBe('/test/second-page')
        expect(controller1.getNext(stateYes)).toBe('/test/summary')

        expect(controller2.getNext(state)).toBe('/test/summary')
        expect(controller2.getNext(stateNo)).toBe('/test/summary')
        expect(controller2.getNext(stateYes)).toBe('/test/summary')
      })
    })

    describe('Summary', () => {
      it('returns the summary path', () => {
        expect(controller1.getSummaryPath()).toBe('/test/summary')
        expect(controller2.getSummaryPath()).toBe('/test/summary')
      })
    })
  })
})
