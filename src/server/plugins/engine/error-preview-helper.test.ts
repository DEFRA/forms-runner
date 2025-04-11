import { expandTemplate } from '~/src/server/plugins/engine/error-preview-helper.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

describe('Error preview helper', () => {
  describe('expandTemplate', () => {
    it('should return expanded template - simple single token', () => {
      const template = messageTemplate.required
      const res = expandTemplate(template, { label: 'Your name' })
      expect(res).toBe('Enter your name')
    })

    it('should return expanded template - multiple tokens', () => {
      const template = messageTemplate.min
      const res = expandTemplate(template, { label: 'Your age', limit: 7 })
      expect(res).toBe('Your age must be 7 characters or more')
    })
  })
})
