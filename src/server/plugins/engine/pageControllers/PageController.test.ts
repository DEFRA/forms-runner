import { type FormDefinition } from '@defra/forms-model'

import formJson from '~/src/server/forms/get-condition-evaluation-context.json' with { type: 'json' }
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/index.js'

describe('Condition Evaluation Context', () => {
  it('correctly includes/filters state values', () => {
    const formModel = new FormModel(formJson as FormDefinition, {
      basePath: 'test'
    })

    // Selected page appears after convergence and contains a conditional field
    // This is the page we're theoretically browsing to
    const testConditionsPage = formModel.pages.find(
      (page) => page.path === '/testconditions'
    )

    if (!testConditionsPage) {
      throw new Error('Test conditions page not found')
    }

    const page = new PageController(formModel, testConditionsPage.pageDef)

    // The state below shows we said we had a UKPassport and entered details for an applicant
    const completeState = {
      progress: [
        '/csds/uk-passport?visit=7O4_nT1TVI',
        '/csds/how-many-people?visit=7O4_nT1TVI',
        '/csds/applicant-one?visit=7O4_nT1TVI',
        '/csds/applicant-one-address?visit=7O4_nT1TVI',
        '/csds/contact-details?visit=7O4_nT1TVI'
      ],
      checkBeforeYouStart: {
        ukPassport: true
      },
      applicantDetails: {
        numberOfApplicants: 1,
        phoneNumber: '1234567890',
        emailAddress: 'developer@example.com'
      },
      applicantOneDetails: {
        firstName: 'Martin',
        middleName: null,
        lastName: 'Crawley',
        address: {
          addressLine1: 'AddressLine1',
          addressLine2: 'AddressLine2',
          town: 'Town',
          postcode: 'Postcode'
        }
      }
    }

    // Calculate our relevantState based on the page we're attempting to load and the above state we provide
    let relevantState = page.getConditionEvaluationContext(
      formModel,
      completeState
    )

    // Our relevantState should know our applicants firstName is Martin
    expect(relevantState.applicantOneDetails).toEqual(
      expect.objectContaining({
        firstName: 'Martin'
      })
    )

    // Now mark that we don't have a UK Passport
    completeState.checkBeforeYouStart.ukPassport = false

    // And recalculate our relevantState
    relevantState = page.getConditionEvaluationContext(formModel, completeState)

    // Our relevantState should no longer know anything about our applicant
    expect(relevantState.applicantOneDetails).toBeUndefined()
    expect(relevantState.checkBeforeYouStart).toEqual(
      expect.objectContaining({
        ukPassport: false
      })
    )
  })
})
