import {
  ComponentType,
  type ComponentDef,
  type FormDefinition
} from '@defra/forms-model'
import { type Request } from '@hapi/hapi'
import { format } from 'date-fns'

import {
  FormModel,
  SummaryViewModel
} from '~/src/server/plugins/engine/models/index.js'
import { FormState } from '~/src/server/plugins/engine/models/types.js'
import { getPersonalisation } from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'

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
      {} as Request
    )

    const formStatus = (previewStatus: boolean) => ({
      state: FormState.DRAFT,
      isPreview: previewStatus
    })

    it('should generate personalisation with form results and form name - Live form', () => {
      const result = getPersonalisation(
        summaryViewModel,
        model,
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
      const result = getPersonalisation(
        summaryViewModel,
        model,
        formStatus(true)
      )

      expect(result.subject).toBe('TEST FORM SUBMISSION: New')
      expect(result.body).toContain('This is a test of the New draft form')
    })
  })
})
