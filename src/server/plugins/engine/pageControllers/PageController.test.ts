import { type FormDefinition } from '@defra/forms-model'

import dateFormConditionJson from '~/src/server/forms/date-branching.json' with { type: 'json' }
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
        '/csds/uk-passport',
        '/csds/how-many-people',
        '/csds/applicant-one',
        '/csds/applicant-one-address',
        '/csds/contact-details'
      ],
      ukPassport: true,
      numberOfApplicants: 2,
      applicantOneFirstName: 'Enrique',
      applicantOneMiddleName: null,
      applicantOneLastName: 'Chase',
      applicantOneAddress: {
        addressLine1: 'AddressLine1',
        addressLine2: 'AddressLine2',
        town: 'Town',
        postcode: 'Postcode'
      },
      applicantTwoFirstName: 'John',
      applicantTwoMiddleName: null,
      applicantTwoLastName: 'Doe',
      applicantTwoAddress: {
        addressLine1: 'AddressLine1',
        addressLine2: 'AddressLine2',
        town: 'Town',
        postcode: 'Postcode'
      }
    }

    // Calculate our relevantState based on the page we're attempting to load and the above state we provide
    let relevantState = page.getConditionEvaluationContext(
      formModel,
      completeState
    )

    // Our relevantState should know our first applicant
    expect(relevantState).toEqual(
      expect.objectContaining({
        applicantOneFirstName: 'Enrique',
        applicantOneLastName: 'Chase',
        applicantOneAddress: {
          addressLine1: 'AddressLine1',
          addressLine2: 'AddressLine2',
          town: 'Town',
          postcode: 'Postcode'
        }
      })
    )

    // Now mark that we don't have a UK Passport
    completeState.ukPassport = false

    // And recalculate our relevantState
    relevantState = page.getConditionEvaluationContext(formModel, completeState)

    // Our relevantState should no longer know anything about our applicant
    expect(relevantState.applicantOneFirstName).toBeUndefined()
    expect(relevantState.applicantOneLastName).toBeUndefined()
    expect(relevantState.applicantOneAddress).toBeUndefined()
    expect(relevantState).toEqual(
      expect.objectContaining({
        ukPassport: false
      })
    )
  })

  describe('DatePartsField', () => {
    it('correctly transforms DateTimeParts components', () => {
      const formModel = new FormModel(dateFormConditionJson as FormDefinition, {
        basePath: 'test'
      })

      const testConditionsPage = formModel.pages.find(
        (page) => page.path === '/page-one'
      )

      if (!testConditionsPage) {
        throw new Error('Test conditions page not found')
      }

      const page = new PageController(formModel, testConditionsPage.pageDef)

      const completeState = {
        progress: [],
        BWvMaM: '2024-01-05T01:02:03.004Z'
      }

      // get the state including our DatePartsField
      const relevantState = page.getConditionEvaluationContext(
        formModel,
        completeState
      )

      // Ensure dates are transformed to yyyy-MM-dd format
      expect(relevantState).toEqual(
        expect.objectContaining({
          BWvMaM: '2024-01-05'
        })
      )
    })
  })
})
