import {
  ComponentType,
  type ComponentDef,
  type FormDefinition
} from '@defra/forms-model'
import { format } from 'date-fns'

import {
  FormModel,
  SummaryViewModel
} from '~/src/server/plugins/engine/models/index.js'
import {
  getPersonalisation,
  getQuestions
} from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { FormStatus, type FormRequest } from '~/src/server/routes/types.js'

describe('SummaryPageController', () => {
  describe('getPersonalisation', () => {
    const component1: ComponentDef = {
      name: 'dateField',
      title: 'Date of marriage',
      type: ComponentType.DatePartsField,
      options: {}
    }

    const page = {
      path: '/first-page',
      title: 'When will you get married?',
      components: [component1],
      next: []
    }

    const definition: FormDefinition = {
      name: 'New',
      pages: [page],
      lists: [],
      sections: [],
      conditions: []
    }

    const model: FormModel = new FormModel(definition, {
      basePath: 'test'
    })

    const summaryViewModel: SummaryViewModel = new SummaryViewModel(
      'Summary',
      model,
      {},
      {},
      {} as FormRequest
    )

    const formStatus = (previewStatus: boolean) => ({
      state: FormStatus.Draft,
      isPreview: previewStatus
    })

    const submitResponse = {
      message: 'Submit completed',
      result: {
        files: {
          main: '00000000-0000-0000-0000-000000000000',
          repeaters: {}
        }
      }
    }

    it('should generate personalisation with form results and form name - Live form', () => {
      const questions = getQuestions(summaryViewModel, model)
      const result = getPersonalisation(
        questions,
        model,
        submitResponse,
        formStatus(false)
      )
      const now = new Date()
      const formattedNow = format(now, 'h:mmaaa')
      const formattedDate = format(now, 'd MMMM yyyy')

      expect(result.subject).toBe('Form received: New')
      expect(result.body).toContain(
        `Form received at ${formattedNow} on ${formattedDate}`
      )
    })

    it('should generate personalisation with form results and form name - Preview form', () => {
      const questions = getQuestions(summaryViewModel, model)
      const result = getPersonalisation(
        questions,
        model,
        submitResponse,
        formStatus(true)
      )

      expect(result.subject).toBe('TEST FORM SUBMISSION: New')
      expect(result.body).toContain('This is a test of the New draft form')
    })
  })
})
