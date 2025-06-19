import { join } from 'node:path'

import {
  formDefinitionSchema,
  formDefinitionV2Schema
} from '@defra/forms-model'

import { getForm } from '~/src/server/plugins/engine/configureEnginePlugin.js'
import { getForms } from '~/test/utils/get-form-definitions.js'

describe('Form definition JSON V1', () => {
  describe.each([
    {
      description: 'Demo forms',
      directory: join(import.meta.dirname, '../../src/server/forms')
    },
    {
      description: 'Test fixtures',
      directory: join(import.meta.dirname, 'definitions')
    }
  ])('$description', ({ directory }) => {
    /** @type {string[]} */
    let filenames

    beforeAll(async () => {
      filenames = (await getForms(directory)).filter(
        (x) => !x.endsWith('-v2.js')
      )
    })

    it('passes schema validation', async () => {
      for (const filename of filenames) {
        const definition = await getForm(join(directory, filename))

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

describe('Form definition JSON V2', () => {
  describe.each([
    {
      description: 'Test fixtures',
      directory: join(import.meta.dirname, 'definitions')
    }
  ])('$description', ({ directory }) => {
    /** @type {string[]} */
    let filenames

    beforeAll(async () => {
      filenames = (await getForms(directory)).filter((x) =>
        x.endsWith('-v2.js')
      )
    })

    it('passes schema validation', async () => {
      for (const filename of filenames) {
        const definition = await getForm(join(directory, filename))

        // Validate form definition
        const result = formDefinitionV2Schema.validate(definition, {
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
