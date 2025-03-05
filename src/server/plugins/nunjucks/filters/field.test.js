import { field } from '~/src/server/plugins/nunjucks/filters/field.js'

describe('field Nunjucks filter', () => {
  /** @type {NunjucksContext} */
  let mockThis

  beforeEach(() => {
    mockThis = /** @type {NunjucksContext} */ (
      /** @type {unknown} */ ({
        ctx: {
          context: {
            componentMap: new Map()
          }
        }
      })
    )
  })

  describe('invalid inputs', () => {
    it('returns undefined for non-string name parameter', () => {
      // @ts-expect-error - testing invalid input
      const result = field.call(mockThis, 123)
      expect(result).toBeUndefined()
    })
  })

  describe('missing context', () => {
    it('returns undefined', () => {
      mockThis.ctx.context = undefined
      const result = field.call(mockThis, 'componentName')
      expect(result).toBeUndefined()
    })
  })

  describe('component lookup', () => {
    it('returns undefined for non-existent component', () => {
      const result = field.call(mockThis, 'nonExistentComponent')
      expect(result).toBeUndefined()
    })
  })

  describe('non-form component', () => {
    it('returns undefined', () => {
      mockThis.ctx.context?.componentMap.set(
        'nonFormComponent',
        // @ts-expect-error - simplified mock component for testing
        { isFormComponent: false }
      )

      const result = field.call(mockThis, 'nonFormComponent')
      expect(result).toBeUndefined()
    })
  })

  describe('valid form component', () => {
    it('returns the component', () => {
      const mockFormComponent = {
        isFormComponent: true,
        someProperty: 'value'
      }
      mockThis.ctx.context?.componentMap.set(
        'validFormComponent',
        // @ts-expect-error - simplified mock component for testing
        mockFormComponent
      )

      const result = field.call(mockThis, 'validFormComponent')
      expect(result).toBe(mockFormComponent)
    })
  })
})

/**
 * @import { NunjucksContext } from '~/src/server/plugins/nunjucks/types.js'
 */
