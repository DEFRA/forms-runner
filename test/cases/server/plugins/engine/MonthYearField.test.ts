import { MonthYearField } from '../../../../../src/server/plugins/engine/components/index.js'
import { messages } from '../../../../../src/server/plugins/engine/pageControllers/validationOptions.js'
import joi from 'joi'

/**
 * This replicates {@link PageControllerBase.validate}
 */
const validate = (schema, value) => {
  return schema.validate(value, { messages })
}

describe('Month Year Field', () => {
  test('Should validate month and year correctly', () => {
    const def = {
      name: 'myComponent',
      title: 'My component',
      hint: 'a hint',
      type: 'MonthYearField',
      options: {}
    }

    const monthYearField = new MonthYearField(def)

    /**
     * This replicates {@link ComponentCollection.formSchema}
     */
    const schema = joi
      .object()
      .keys(monthYearField.getFormSchemaKeys())
      .required()

    expect(
      validate(schema, {
        myComponent__year: 2000,
        myComponent__month: 0
      }).error.message
    ).toContain('must be between 1 and 12')

    expect(
      validate(schema, {
        myComponent__year: 1,
        myComponent__month: 12
      }).error.message
    ).toContain('must be 1000 or higher')

    expect(
      validate(schema, {
        myComponent__year: 2000,
        myComponent__month: 12
      }).error
    ).toBeUndefined()
  })
})
