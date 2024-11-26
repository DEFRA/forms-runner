import { tmpdir } from 'node:os'

import { config } from '~/src/config/index.js'
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

      expect(ctx).toEqual(
        expect.objectContaining({
          cdpEnvironment: config.get('cdpEnvironment'),
          phaseTag: config.get('phaseTag'),
          serviceName: config.get('serviceName'),
          serviceVersion: config.get('serviceVersion')
        })
      )
    })
  })
})
