import { page } from '~/src/server/plugins/nunjucks/filters/page.js'

describe('page Nunjucks filter', () => {
  /** @type { NunjucksContext } */
  let mockThis

  beforeEach(() => {
    mockThis = /** @type {NunjucksContext} */ (
      /** @type {unknown} */ ({
        ctx: {
          context: {
            pageMap: new Map()
          }
        }
      })
    )
  })

  describe('invalid inputs', () => {
    it('returns undefined for non-string path parameter', () => {
      // @ts-expect-error - testing invalid input
      const result = page.call(mockThis, 123)

      expect(result).toBeUndefined()
    })
  })

  describe('missing context', () => {
    it('returns undefined', () => {
      mockThis.ctx.context = undefined

      const result = page.call(mockThis, 'pagePath')

      expect(result).toBeUndefined()
    })
  })

  describe('page lookup', () => {
    it('returns undefined for non-existent page', () => {
      const result = page.call(mockThis, 'nonExistentPage')

      expect(result).toBeUndefined()
    })

    it('returns the page when found', () => {
      const mockPage = {
        path: '/some-page',
        someProperty: 'value'
      }
      mockThis.ctx.context?.pageMap.set(
        'validPage',
        // @ts-expect-error - simplified mock page for testing
        mockPage
      )

      const result = page.call(mockThis, 'validPage')

      expect(result).toBe(mockPage)
    })
  })
})

/**
 * @import { NunjucksContext } from '~/src/server/plugins/nunjucks/types.js'
 */
