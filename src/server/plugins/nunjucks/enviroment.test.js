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

  describe('checkComponentTemplates function', () => {
    /** @type {Function} */
    let checkComponentTemplates

    beforeEach(() => {
      checkComponentTemplates = environment.getGlobal('checkComponentTemplates')

      jest
        .spyOn(helpers, 'evaluateTemplate')
        .mockImplementation((text) => `evaluated-${text}`)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    test('evaluates string content for Html components', () => {
      const formContext = { someData: 'some-text' }
      const nunjucksCtx = {
        ctx: { context: formContext }
      }

      const component = {
        type: 'Html',
        isFormComponent: false,
        model: {
          content: 'Some {{ context.someData }} content'
        }
      }

      const result = /** @type {{ model: { content: string } }} */ (
        checkComponentTemplates.call(nunjucksCtx, component)
      )

      expect(helpers.evaluateTemplate).toHaveBeenCalledWith(
        'Some {{ context.someData }} content',
        formContext
      )
      expect(result.model.content).toBe(
        'evaluated-Some {{ context.someData }} content'
      )
    })

    test('does not evaluate non-string content for Html components', () => {
      const formContext = { someData: 'some-text' }
      const nunjucksCtx = {
        ctx: { context: formContext }
      }

      const nonStringContent = { some: 'object' }
      const component = {
        type: 'Html',
        isFormComponent: false,
        model: {
          content: nonStringContent
        }
      }

      const result = /** @type {{ model: { content: string } }} */ (
        checkComponentTemplates.call(nunjucksCtx, component)
      )

      expect(helpers.evaluateTemplate).not.toHaveBeenCalled()

      expect(result.model.content).toBe(nonStringContent)
    })

    test('evaluates label text for form components', () => {
      const formContext = { someData: 'some-text' }
      const nunjucksCtx = {
        ctx: { context: formContext }
      }

      const component = {
        isFormComponent: true,
        model: {
          label: {
            text: 'Label with {{ context.someData }}'
          }
        }
      }

      const result = /** @type {{ model: { label?: { text: string } } }} */ (
        checkComponentTemplates.call(nunjucksCtx, component)
      )

      expect(helpers.evaluateTemplate).toHaveBeenCalledWith(
        'Label with {{ context.someData }}',
        formContext
      )

      expect(result.model.label?.text).toBe(
        'evaluated-Label with {{ context.someData }}'
      )
    })
  })

  describe('evaluate function', () => {
    /** @type {Function} */
    let evaluateFunc

    beforeEach(() => {
      evaluateFunc = environment.getGlobal('evaluate')

      jest
        .spyOn(helpers, 'evaluateTemplate')
        .mockImplementation((text) => `evaluated-${text}`)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    test('evaluates template when context is present', () => {
      const formContext = { someData: 'some-text' }
      const nunjucksCtx = {
        ctx: { context: formContext }
      }

      const template = 'Template with {{ context.someData }}'
      const result = evaluateFunc.call(nunjucksCtx, template)

      expect(helpers.evaluateTemplate).toHaveBeenCalledWith(
        template,
        formContext
      )
      expect(result).toBe('evaluated-Template with {{ context.someData }}')
    })

    test('returns template unchanged when context is not present', () => {
      const nunjucksCtx = {
        ctx: {}
      }

      const template = 'Template with {{ context.someData }}'
      const result = evaluateFunc.call(nunjucksCtx, template)

      expect(helpers.evaluateTemplate).not.toHaveBeenCalled()

      expect(result).toBe(template)
    })
  })
})

/*
 * @import { ComponentViewModel } from '~/src/server/plugins/engine/components/types.js'
 */
