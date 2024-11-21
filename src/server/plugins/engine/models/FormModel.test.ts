import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/conditions-escaping.js'

describe('FormModel', () => {
  describe('Constructor', () => {
    it("doesn't throw when conditions are passed with apostrophes", () => {
      expect(
        () => new FormModel(definition, { basePath: 'test' })
      ).not.toThrow()
    })
  })
})
