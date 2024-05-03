import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { NotifyModel } from '~/src/server/plugins/engine/models/submission/NotifyModel.js'
import json from '~/src/server/plugins/engine/models/submission/__tests__/NotifyModel.test.json' with { type: 'json' }
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'

const testFormSubmission = (state: FormSubmissionState) => {
  const notifyOutputConfiguration = {
    apiKey: 'test',
    templateId: 'test',
    emailField: 'TZOHRn',
    personalisation: ['wVUZJW']
  }

  const form = new FormModel(json, {})
  return NotifyModel(form, notifyOutputConfiguration, state)
}

describe('NotifyModel', () => {
  test('returns correct personalisation when a list is passed in and both conditions are satisfied', () => {
    const state: FormSubmissionState = {
      SWJtVi: true,
      dxWjPr: true,
      TZOHRn: 'test@test.com'
    }
    const model = testFormSubmission(state)
    expect(model.personalisation.wVUZJW).toBe(`* Item 1\n* Item 2\n`)
  })
  test('returns correct personalisation when a list is passed in and the second condition is satisfied', () => {
    const state: FormSubmissionState = {
      SWJtVi: true,
      dxWjPr: false,
      TZOHRn: 'test@test.com'
    }

    const model = testFormSubmission(state)

    expect(model.personalisation.wVUZJW).toBe(`* Item 1\n`)
  })
  test('returns an empty string when a list is passed in and no conditions are satisfied', () => {
    const state: FormSubmissionState = {
      SWJtVi: false,
      dxWjPr: false,
      TZOHRn: 'test@test.com'
    }

    const model = testFormSubmission(state)

    expect(model.personalisation.wVUZJW).toBe('')
  })
})
