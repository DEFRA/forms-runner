import { ComponentType, type ComponentDef } from '@defra/forms-model'

import { NumberField } from '~/src/server/plugins/engine/components/NumberField.js'
import { messages } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

describe('Number field', () => {
  const baseDef: ComponentDef = {
    name: 'myComponent',
    title: 'My component',
    type: ComponentType.NumberField,
    options: { required: true },
    schema: {}
  }

  test('Error is displayed correctly when max configured', () => {
    const def: ComponentDef = {
      ...baseDef,
      schema: { max: 30 }
    }
    const numberField = new NumberField(def)
    const { formSchema: schema } = numberField

    expect(schema.validate(40, { messages }).error.message).toContain(
      'must be 30 or lower'
    )

    expect(schema.validate(30, { messages }).error).toBeUndefined()
  })

  test('Error is displayed correctly when min configured', () => {
    const def: ComponentDef = {
      ...baseDef,
      schema: { min: 30 }
    }
    const numberField = new NumberField(def)
    const { formSchema: schema } = numberField

    expect(schema.validate(20, { messages }).error.message).toContain(
      'must be 30 or higher'
    )

    expect(schema.validate(40, { messages }).error).toBeUndefined()
  })

  test('Prefix and suffix are passed to view model', () => {
    const def: ComponentDef = {
      ...baseDef,
      options: { prefix: '@£%', suffix: '&^%%' }
    }
    const numberFieldPrefixSuffix = new NumberField(def)

    expect(numberFieldPrefixSuffix.getViewModel({})).toEqual(
      expect.objectContaining({
        prefix: { text: '@£%' },
        suffix: { text: '&^%%' }
      })
    )
  })
})
