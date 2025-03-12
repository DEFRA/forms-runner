import { getPageHref } from '~/src/server/plugins/engine/index.js'
import { href } from '~/src/server/plugins/nunjucks/filters/href.js'

jest.mock('~/src/server/plugins/engine/index.ts', () => ({
  getPageHref: jest.fn()
}))

describe('href Nunjucks filter', () => {
  /** @type { NunjucksContext } */
  let mockThis

  beforeEach(() => {
    jest.clearAllMocks()

    mockThis = /** @type {NunjucksContext} */ (
      /** @type {unknown} */ ({
        ctx: {
          context: {
            pageMap: new Map()
          }
        }
      })
    )

    jest.mocked(getPageHref).mockReturnValue('/some-page')
  })

  describe('invalid inputs', () => {
    it('returns undefined for non-string path parameter', () => {
      // @ts-expect-error - testing invalid input
      const result = href.call(mockThis, 123)

      expect(result).toBeUndefined()
      expect(getPageHref).not.toHaveBeenCalled()
    })
  })

  describe('missing context', () => {
    it('returns undefined', () => {
      mockThis.ctx.context = undefined

      const result = href.call(mockThis, 'pagePath')

      expect(result).toBeUndefined()
      expect(getPageHref).not.toHaveBeenCalled()
    })
  })

  describe('page lookup', () => {
    it('returns undefined for non-existent page', () => {
      const result = href.call(mockThis, 'nonExistentPage')

      expect(result).toBeUndefined()
      expect(getPageHref).not.toHaveBeenCalled()
    })
  })

  describe('valid page', () => {
    it('returns the href for the page', () => {
      const mockPage = {
        path: '/some-page',
        someProperty: 'value'
      }
      mockThis.ctx.context?.pageMap.set(
        'validPage',
        // @ts-expect-error - simplified mock page for testing
        mockPage
      )

      const result = href.call(mockThis, 'validPage')

      expect(getPageHref).toHaveBeenCalledWith(mockPage)
      expect(result).toBe('/some-page')
    })
  })
})

/**
 * @import { NunjucksContext } from '~/src/server/plugins/nunjucks/types.js'
 */
