import os from 'node:os'

import {
  ConditionBuildError,
  InvalidFormDefinitionError,
  UnknownComponentTypeError,
  UnknownPageControllerError
} from '@defra/forms-engine-plugin/engine/errors.js'
import { formDefinitionV2Schema } from '@defra/forms-model'

import { interpretError } from '~/src/server/plugins/errorInterpretation.js'

describe('interpretError', () => {
  test('Joi definition validation errors produce getErrors-derived causes', () => {
    const { error } = formDefinitionV2Schema.validate({}, { abortEarly: false })

    const result = interpretError(error)

    expect(result.causes.length).toBeGreaterThan(0)
    expect(result.technical).toContain('required')
  })

  test('ConditionBuildError names the condition', () => {
    const error = new ConditionBuildError('Existing user', {
      cause: new Error('parse error [1:24]: Expected EOF')
    })

    const result = interpretError(error)

    expect(result.causes).toEqual([
      "The condition 'Existing user' could not be understood. Check that it refers to the right question and answer option."
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
      "This form uses a page type ('NoSuchPageController') this version of the service does not recognise."
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
