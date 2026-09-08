import { FormStatus } from '@defra/forms-model'

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
})
