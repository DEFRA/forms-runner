import * as helpers from '~/src/server/plugins/engine/helpers.js'
import { environment } from '~/src/server/plugins/nunjucks/environment.js'

describe('Nunjucks environment', () => {
  describe('checkErrorTemplates function', () => {
    /** @type {Function} */
    let checkErrorTemplates

    beforeEach(() => {
      checkErrorTemplates = environment.getGlobal('checkErrorTemplates')

      jest
        .spyOn(helpers, 'evaluateTemplate')
        .mockImplementation((text) => `evaluated-${text}`)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    test('returns errors unchanged when context is not present', () => {
      const nunjucksCtx = {
        ctx: {}
      }

      const errors = [{ text: 'Error 1' }, { text: 'Error 2' }]

      const result = checkErrorTemplates.call(nunjucksCtx, errors)

      expect(result).toBe(errors)
      expect(helpers.evaluateTemplate).not.toHaveBeenCalled()
    })

    test('evaluates error texts when context is present', () => {
      const formContext = { someData: 'some-text' }
      const nunjucksCtx = {
        ctx: { context: formContext }
      }

      const errors = [{ text: 'Error 1' }, { text: 'Error 2' }]

      const result = checkErrorTemplates.call(nunjucksCtx, errors)

      expect(helpers.evaluateTemplate).toHaveBeenCalledTimes(2)
      expect(helpers.evaluateTemplate).toHaveBeenCalledWith(
        'Error 1',
        formContext
      )
      expect(helpers.evaluateTemplate).toHaveBeenCalledWith(
        'Error 2',
        formContext
      )

      expect(result).toEqual([
        { text: 'evaluated-Error 1' },
        { text: 'evaluated-Error 2' }
      ])
    })
  })
})
