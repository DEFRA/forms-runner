import os from 'node:os'

import {
  ConditionBuildError,
  InvalidFormDefinitionError,
  SchemaValidationError,
  UnknownComponentTypeError,
  UnknownPageControllerError
} from '@defra/forms-engine-plugin/engine/errors.js'
import { formDefinitionV2Schema, formMetadataSchema } from '@defra/forms-model'

import { interpretError } from '~/src/server/plugins/errorInterpretation.js'
import { MetadataValidationError } from '~/src/server/services/errors.js'

describe('interpretError', () => {
  test('metadata validation errors point the author at the form overview', () => {
    const { error } = formMetadataSchema.validate({}, { abortEarly: false })
    if (!error) throw new Error('expected validation error')

    const result = interpretError(new MetadataValidationError(error))

    expect(result.causes).toEqual([
      "Some of the form's overview details are invalid. Go back to the form overview and check details such as contact information and email addresses."
    ])
    // the field-level detail still appears in the technical text
    expect(result.technical).toContain('"title" is required')
    // metadata failures must not claim the form definition is broken
    expect(result.causes.join(' ')).not.toContain('form definition')
  })

  test('definition validation errors produce coded causes', () => {
    const { error } = formDefinitionV2Schema.validate({}, { abortEarly: false })
    if (!error) throw new Error('expected validation error')

    const result = interpretError(new SchemaValidationError(error))

    expect(result.causes).toEqual([
      'There is a problem with the form definition. Check your changes and try again.'
    ])
    expect(result.technical).toContain('Invalid form definition:')
  })

  test('duplicate-value schema errors become distinct friendly causes with positions', () => {
    const definition = {
      name: 'x',
      engine: 'V2',
      schema: 2,
      startPage: '/summary',
      pages: [
        {
          id: '449c053b-9201-4312-9a75-187afc6ba48b',
          path: '/one',
          title: 'One',
          components: [],
          next: []
        },
        {
          id: '449c053b-9201-4312-9a75-187afc6ba48c',
          path: '/summary',
          title: 'Summary',
          controller: 'SummaryPageController',
          components: []
        }
      ],
      lists: [],
      sections: [],
      conditions: []
    }
    definition.pages.push(structuredClone(definition.pages[0]))

    const { error } = formDefinitionV2Schema.validate(definition, {
      abortEarly: false
    })
    if (!error) throw new Error('expected validation error')

    const result = interpretError(new SchemaValidationError(error))

    expect(result.causes).toEqual([
      'Each page must have a unique ID. Change the page ID to one that is not already used.',
      'Each page must have a unique path. Change the page path to one that is not already used.'
    ])
  })

  test('reference schema errors become friendly causes', () => {
    const joiLikeCause = {
      isJoi: true,
      message: 'x',
      details: [
        {
          message:
            '"conditions[0].items[0].componentId" must be [ref:root:pages]',
          path: ['conditions', 0, 'items', 0, 'componentId'],
          context: {
            errorType: 'ref',
            errorCode: 'ref_condition_component_id',
            key: 'componentId'
          }
        }
      ]
    }

    const result = interpretError(
      new SchemaValidationError(
        /** @type {import('joi').ValidationError} */ (
          /** @type {unknown} */ (joiLikeCause)
        )
      )
    )

    expect(result.causes).toEqual([
      'Remove the condition before deleting this page'
    ])
  })

  test('ConditionBuildError names the condition', () => {
    const error = new ConditionBuildError('Existing user', {
      cause: new Error('parse error [1:24]: Expected EOF')
    })

    const result = interpretError(error)

    expect(result.causes).toEqual([
      "The condition 'Existing user' is invalid. Check that it refers to the right question and answer option."
    ])
    expect(result.technical).toContain(
      "Failed to build condition 'Existing user'"
    )
    expect(result.technical).toContain(
      'Caused by: parse error [1:24]: Expected EOF'
    )
  })

  test('UnknownPageControllerError names the controller', () => {
    const result = interpretError(
      new UnknownPageControllerError('NoSuchPageController')
    )

    expect(result.causes).toEqual([
      'This form uses a page type this version of the service does not recognise.'
    ])
  })

  test('UnknownComponentTypeError names the component type', () => {
    const result = interpretError(new UnknownComponentTypeError('NopeField'))

    expect(result.causes).toEqual([
      "This form uses a question type ('NopeField') this version of the service does not recognise."
    ])
  })

  test('unrecognised InvalidFormDefinitionError subclasses fall back to their message', () => {
    class FutureDefinitionError extends InvalidFormDefinitionError {}
    const result = interpretError(
      new FutureDefinitionError('a future failure mode')
    )

    expect(result.causes).toEqual(['a future failure mode'])
  })

  test('unknown errors produce no causes, technical only', () => {
    const result = interpretError(new Error('something else entirely'))

    expect(result.causes).toEqual([])
    expect(result.technical).toBe('something else entirely')
  })

  test('cwd and homedir are redacted by literal replacement', () => {
    const error = new Error(
      `Cannot find module '${process.cwd()}/node_modules/x' from '${os.homedir()}/y'`
    )

    const result = interpretError(error)

    expect(result.technical).toBe(
      "Cannot find module './node_modules/x' from '~/y'"
    )
  })

  test('path-like text outside the known prefixes is left untouched', () => {
    const result = interpretError(new Error('open /etc/whatever failed'))

    expect(result.technical).toBe('open /etc/whatever failed')
  })

  test('long technical text is truncated at 2000 characters', () => {
    const result = interpretError(new Error('x'.repeat(3000)))

    expect(result.technical).toHaveLength(2000 + '… (truncated)'.length)
    expect(result.technical.endsWith('… (truncated)')).toBe(true)
  })

  test('stack content never appears in technical text', () => {
    const error = new Error('boom')

    const result = interpretError(error)

    expect(result.technical).not.toContain('at ')
  })
})
