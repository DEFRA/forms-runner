import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { formDefinitionSchema } from '@defra/forms-model'

import { getForm, getForms } from '~/test/utils/get-form-definitions.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe('Form definition JSON', () => {
  describe.each([
    {
      description: 'Demo forms',
      directory: join(testDir, '../../src/server/forms')
    },
    {
      description: 'Test fixtures',
      directory: join(testDir, 'definitions')
    }
  ])('$description', ({ directory }) => {
    /** @type {string[]} */
    let filenames

    beforeAll(async () => {
      filenames = await getForms(directory)
    })

    it('passes schema validation', async () => {
      for (const filename of filenames) {
        const definition = await getForm(filename, directory)

        // Validate form definition
        const result = formDefinitionSchema.validate(definition, {
          abortEarly: false
        })

        expect({
          filename,
          directory,
          error: result.error
        }).toMatchObject({
          filename, // Include filename in test output
          directory, // Include directory in test output
          error: undefined
        })
      }
    })
  })
})
