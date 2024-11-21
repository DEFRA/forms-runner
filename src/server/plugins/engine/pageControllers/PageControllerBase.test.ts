import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { PageControllerBase } from '~/src/server/plugins/engine/pageControllers/PageControllerBase.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'
import definition from '~/test/form/definitions/conditions-basic.js'

describe('PageControllerBase', () => {
  let controller1: PageControllerBase
  let controller2: PageControllerBase

  beforeEach(() => {
    const { pages } = definition

    const model = new FormModel(definition, {
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
  })
})
