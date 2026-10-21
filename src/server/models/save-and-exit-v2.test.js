import { FormStatus } from '@defra/forms-model'

import { constructHomepageLink } from '~/src/server/helpers/route-helpers.js'
import { constructFormUrl } from '~/src/server/models/save-and-exit-v2.js'

describe('Save and exit v2 models', () => {
  describe('constructFormUrl', () => {
    test('should construct form url', () => {
      expect(constructFormUrl('my-form-slug', FormStatus.Draft)).toBe(
        '/form/preview/draft/my-form-slug'
      )
      expect(constructFormUrl('my-form-slug', FormStatus.Live)).toBe(
        '/form/preview/live/my-form-slug'
      )
      expect(constructFormUrl('my-form-slug')).toBe('/form/my-form-slug')
    })
  })

  describe('constructHomepageLink', () => {
    test('should construct backlink', () => {
      expect(constructHomepageLink('my-form-slug', FormStatus.Draft)).toBe(
        '/homepage/preview/draft/my-form-slug'
      )
      expect(constructHomepageLink('my-form-slug', FormStatus.Live)).toBe(
        '/homepage/preview/live/my-form-slug'
      )
      expect(constructHomepageLink('my-form-slug')).toBe(
        '/homepage/my-form-slug'
      )
    })
  })
})
