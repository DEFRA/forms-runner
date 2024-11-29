import { type SubmitResponsePayload } from '@defra/forms-model'
import { addDays, format } from 'date-fns'
import { outdent } from 'outdent'

import {
  FormModel,
  type SummaryViewModel
} from '~/src/server/plugins/engine/models/index.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'
import {
  SummaryPageController,
  getFormSubmissionData,
  getPersonalisation
} from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { type FormSubmissionState } from '~/src/server/plugins/engine/types.js'
import { FormStatus, type FormRequest } from '~/src/server/routes/types.js'
import definition from '~/test/form/definitions/repeat-mixed.js'

describe('SummaryPageController', () => {
  const itemId1 = 'abc-123'
  const itemId2 = 'xyz-987'

  let model: FormModel
  let state: FormSubmissionState
  let summaryViewModel: SummaryViewModel
  let submitResponse: SubmitResponsePayload
  let items: DetailItem[]

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })

    state = {
      progress: [
        'repeat/delivery-or-collection',
        `repeat/pizza-order/${itemId1}`,
        `repeat/pizza-order/${itemId2}`,
        'repeat/summary'
      ],
      orderType: 'delivery',
      pizza: [
        {
          toppings: 'Ham',
          quantity: 2,
          itemId: itemId1
        },
        {
          toppings: 'Pepperoni',
          quantity: 1,
          itemId: itemId2
        }
      ]
    }

    const pageDef = definition.pages[2]
    const controller = new SummaryPageController(model, pageDef)

    const request = {
      url: new URL('http://example.com/repeat/pizza-order/summary'),
      path: '/repeat/pizza-order/summary',
      params: {
        path: 'pizza-order',
        slug: 'repeat'
      },
      query: {},
      app: { model }
    } as FormRequest

    summaryViewModel = controller.getSummaryViewModel(model, state, request)

    submitResponse = {
      message: 'Submit completed',
      result: {
        files: {
          main: '00000000-0000-0000-0000-000000000000',
          repeaters: {
            pizza: '11111111-1111-1111-1111-111111111111'
          }
        }
      }
    }

    items = getFormSubmissionData(
      summaryViewModel.context,
      summaryViewModel.details
    )
  })

  describe('getPersonalisation', () => {
    it.each([
      {
        state: FormStatus.Live,
        isPreview: false
      },
      {
        state: FormStatus.Draft,
        isPreview: true
      }
    ])('should personalise $state email', (formStatus) => {
      const result = getPersonalisation(
        items,
        model,
        submitResponse,
        formStatus
      )

      const dateNow = new Date()
      const dateExpiry = addDays(dateNow, 30)

      // Check for link expiry message
      expect(result).toHaveProperty(
        'body',
        expect.stringContaining(
          `^ For security reasons, the links in this email expire at ${format(dateExpiry, 'h:mmaaa')} on ${format(dateExpiry, 'eeee d MMMM yyyy')}`
        )
      )

      // Check for form answers
      expect(result).toHaveProperty(
        'body',
        expect.stringContaining(
          outdent`
            Form received at ${format(dateNow, 'h:mmaaa')} on ${format(dateNow, 'd MMMM yyyy')}.


            ## How would you like to receive your pizza?

            * Delivery



            ## Pizza
            [Download Pizza (CSV)](https://test-designer.cdp-int.defra.cloud/file-download/11111111-1111-1111-1111-111111111111)



            [Download main form (CSV)](https://test-designer.cdp-int.defra.cloud/file-download/00000000-0000-0000-0000-000000000000)
          `
        )
      )
    })

    it('should add test warnings to preview email only', () => {
      const formStatus = {
        state: FormStatus.Draft,
        isPreview: true
      }

      const result1 = getPersonalisation(items, model, submitResponse, {
        state: FormStatus.Live,
        isPreview: false
      })

      const result2 = getPersonalisation(items, model, submitResponse, {
        state: FormStatus.Draft,
        isPreview: true
      })

      expect(result1.subject).toBe(`Form received: ${definition.name}`)
      expect(result2.subject).toBe(`TEST FORM SUBMISSION: ${definition.name}`)

      expect(result1.body).not.toContain(
        `This is a test of the ${definition.name} ${formStatus.state} form`
      )

      expect(result2.body).toContain(
        `This is a test of the ${definition.name} ${formStatus.state} form`
      )
    })
  })
})
