import { format, addDays } from 'date-fns'

import { getPersonalisation } from './SummaryPageController.js'

describe('getPersonalisation', () => {
  const summaryViewModel = {
    relevantPages: [
      {
        path: '/page1',
        title: 'Page 1',
        section: { name: 'Section 1' }
      }
    ],
    details: [
      {
        items: [
          {
            path: '/page1',
            name: 'field1',
            title: 'Field 1',
            dataType: 'string',
            value: 'Answer 1'
          }
        ]
      }
    ]
  }

  const model = {
    name: 'Test Form',
    def: {
      metadata: {},
      feedback: {}
    },
    pages: []
  }

  it('should generate personalisation with form results and form name - Live form', () => {
    const result = getPersonalisation(summaryViewModel, model, false)
    const now = new Date()
    const formattedNow = format(now, 'h:mmaaa')
    const formattedDate = format(now, 'd MMMM yyyy')

    expect(result.formName).toBe('Form received: Test Form')
    expect(result.formResults).toContain(
      `Form received at ${formattedNow} on ${formattedDate}`
    )
  })

  it('should generate personalisation with form results and form name - Preview form', () => {
    const result = getPersonalisation(summaryViewModel, model, true)

    expect(result.formName).toBe('TEST FORM SUBMISSION: Test Form')
    expect(result.formResults).toContain('This is a test of the Test Form form')
  })
})
