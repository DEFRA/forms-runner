import { type ComponentDef } from '@defra/forms-model'

import { createComponent } from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/basic.js'

const formModel = new FormModel(definition, {
  basePath: 'test'
})

describe('helpers tests', () => {
  test('should throw if invalid type', () => {
    expect(() =>
      createComponent(
        {
          type: 'invalid-type'
        } as unknown as ComponentDef,
        {
          model: formModel
        }
      )
    ).toThrow('Component type invalid-type does not exist')
  })
})
