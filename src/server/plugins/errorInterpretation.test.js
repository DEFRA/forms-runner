import os from 'node:os'

import {
  ConditionBuildError,
  InvalidFormDefinitionError,
  SchemaValidationError,
  UnknownComponentTypeError,
  UnknownPageControllerError
} from '@defra/forms-engine-plugin/engine/errors.js'
import { formDefinitionV2Schema } from '@defra/forms-model'

import { interpretError } from '~/src/server/plugins/errorInterpretation.js'

describe('interpretError', () => {
  test('Joi definition validation errors produce getErrors-derived causes', () => {
    const { error } = formDefinitionV2Schema.validate({}, { abortEarly: false })
    if (!error) throw new Error('expected validation error')

    const result = interpretError(error)

    expect(result.causes.length).toBeGreaterThan(0)
    expect(result.technical).toContain('required')
  })

  test('SchemaValidationError-wrapped Joi errors produce the same causes as raw ones', () => {
    const { error } = formDefinitionV2Schema.validate({}, { abortEarly: false })
    if (!error) throw new Error('expected validation error')

    const raw = interpretError(error)
    const wrapped = interpretError(new SchemaValidationError(error))

    expect(wrapped.causes).toEqual(raw.causes)
    expect(wrapped.technical).toContain('Invalid form definition:')
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

    const result = interpretError(error)

    expect(result.causes).toEqual([
      'Two pages have the same ID (entries 1 and 3)',
      'Two pages have the same path (entries 1 and 3)'
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
      /** @type {import('joi').ValidationError} */ (
        /** @type {unknown} */ (joiLikeCause)
      )
    )

    expect(result.causes).toEqual([
      'A condition refers to a question that does not exist'
    ])
  })

  test('unmapped schema errors fall back to the cleaned Joi message, deduplicated', () => {
    const { error } = formDefinitionV2Schema.validate({}, { abortEarly: false })
    if (!error) throw new Error('expected validation error')

    const result = interpretError(error)

    expect(result.causes).toContain("'pages' is required")
    expect(result.causes).not.toContain('"pages" is required')
    expect(new Set(result.causes).size).toBe(result.causes.length)
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
