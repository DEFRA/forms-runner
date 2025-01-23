import { tmpdir } from 'node:os'

import { config } from '~/src/config/index.js'
import { encodeUrl } from '~/src/server/plugins/engine/helpers.js'
import { context } from '~/src/server/plugins/nunjucks/context.js'

describe('Nunjucks context', () => {
  beforeEach(() => jest.resetModules())

  describe('Asset path', () => {
    it("should include 'assetPath' for GOV.UK Frontend icons", () => {
      const { assetPath } = context(null)
      expect(assetPath).toBe('/assets')
    })
  })

  describe('Asset helper', () => {
    it("should locate 'assets-manifest.json' assets", () => {
      const { getAssetPath } = context(null)

      expect(getAssetPath('example.scss')).toBe(
        '/stylesheets/example.xxxxxxx.min.css'
      )

      expect(getAssetPath('example.mjs')).toBe(
        '/javascripts/example.xxxxxxx.min.js'
      )
    })

    it("should return path when 'assets-manifest.json' is missing", async () => {
      await jest.isolateModulesAsync(async () => {
        const { config } = await import('~/src/config/index.js')

        // Import when isolated to avoid cache
        const { context } = await import(
          '~/src/server/plugins/nunjucks/context.js'
        )

        // Update config for missing manifest
        config.set('publicDir', tmpdir())
        const { getAssetPath } = context(null)

        // Uses original paths when missing
        expect(getAssetPath('example.scss')).toBe('/example.scss')
        expect(getAssetPath('example.mjs')).toBe('/example.mjs')
      })
    })

    it('should return path to unknown assets', () => {
      const { getAssetPath } = context(null)

      expect(getAssetPath()).toBe('/')
      expect(getAssetPath('example.jpg')).toBe('/example.jpg')
      expect(getAssetPath('example.gif')).toBe('/example.gif')
    })
  })

  describe('Config', () => {
    it('should include environment, phase tag and service info', () => {
      const ctx = context(null)

      expect(ctx.config).toEqual(
        expect.objectContaining({
          cdpEnvironment: config.get('cdpEnvironment'),
          feedbackLink: encodeUrl(config.get('feedbackLink')),
          googleAnalyticsTrackingId: config.get('googleAnalyticsTrackingId'),
          phaseTag: config.get('phaseTag'),
          serviceBannerText: config.get('serviceBannerText'),
          serviceName: config.get('serviceName'),
          serviceVersion: config.get('serviceVersion')
        })
      )
    })
  })

  describe('Crumb', () => {
    it('should handle malformed requests with missing state', () => {
      // While state should always exist in a valid Hapi request (it holds cookies),
      // we've seen malformed requests in production where it's missing
      const malformedRequest = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          server: {
            plugins: {
              crumb: {
                generate: jest.fn()
              }
            }
          },
          plugins: {},
          route: {
            settings: {
              plugins: {}
            }
          },
          path: '/test',
          url: { search: '' }
          // state intentionally omitted to test real malformed requests
        })
      )

      const { crumb } = context(malformedRequest)
      expect(crumb).toBeUndefined()
      expect(
        malformedRequest.server.plugins.crumb.generate
      ).not.toHaveBeenCalled()
    })

    it('should generate crumb when state exists', () => {
      const mockCrumb = 'generated-crumb-value'
      const validRequest = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          server: {
            plugins: {
              crumb: {
                generate: jest.fn().mockReturnValue(mockCrumb)
              }
            }
          },
          plugins: {},
          route: {
            settings: {
              plugins: {}
            }
          },
          path: '/test',
          url: { search: '' },
          state: {}
        })
      )

      const { crumb } = context(validRequest)
      expect(crumb).toBe(mockCrumb)
      expect(validRequest.server.plugins.crumb.generate).toHaveBeenCalledWith(
        validRequest
      )
    })
  })
})

/**
 * @import { FormRequest } from '~/src/server/routes/types.js'
 */
