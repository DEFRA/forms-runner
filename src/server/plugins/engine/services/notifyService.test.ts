import { checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'
import { getFormatter } from '~/src/server/plugins/engine/outputFormatters/index.js'
import { submit } from '~/src/server/plugins/engine/services/notifyService.js'
import {
  FormStatus,
  type FormRequestPayload
} from '~/src/server/routes/types.js'
import { sendNotification } from '~/src/server/utils/notify.js'

jest.mock('~/src/server/utils/notify')
jest.mock('~/src/server/plugins/engine/helpers')
jest.mock('~/src/server/plugins/engine/outputFormatters/index')

describe('notifyService', () => {
  const submitResponse = {
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

  const items: DetailItem[] = []

  const mockRequest: FormRequestPayload = jest.mocked<FormRequestPayload>({
    path: 'test',
    logger: {
      info: jest.fn()
    }
  } as unknown as FormRequestPayload)
  let model: FormModel
  const sendNotificationMock = jest.mocked(sendNotification)

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('creates a subject line for real forms', async () => {
    model = {
      name: 'foobar',
      def: {
        output: {
          audience: 'human',
          version: '1'
        }
      }
    } as FormModel

    jest.mocked(checkFormStatus).mockReturnValue({
      isPreview: false,
      state: FormStatus.Draft
    })
    jest.mocked(getFormatter).mockReturnValue(() => 'dummy-live')

    await submit(mockRequest, model, 'test@defra.gov.uk', items, submitResponse)

    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personalisation: {
          subject: `Form submission: foobar`,
          body: 'dummy-live'
        }
      })
    )
  })

  it('creates a subject line for preview forms', async () => {
    model = {
      name: 'foobar',
      def: {
        output: {
          audience: 'human',
          version: '1'
        }
      }
    } as FormModel

    jest.mocked(checkFormStatus).mockReturnValue({
      isPreview: true,
      state: FormStatus.Draft
    })
    jest.mocked(getFormatter).mockReturnValue(() => 'dummy-preview')

    await submit(mockRequest, model, 'test@defra.gov.uk', items, submitResponse)

    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personalisation: {
          subject: `TEST FORM SUBMISSION: foobar`,
          body: 'dummy-preview'
        }
      })
    )
  })

  it('base64 encodes form data when aimed at machines', async () => {
    model = {
      name: 'foobar',
      def: {
        output: {
          audience: 'machine',
          version: '1'
        }
      }
    } as FormModel

    jest.mocked(checkFormStatus).mockReturnValue({
      isPreview: true,
      state: FormStatus.Draft
    })
    jest
      .mocked(getFormatter)
      .mockReturnValue(() => 'dummy-preview " Hello world \' !@/')

    await submit(mockRequest, model, 'test@defra.gov.uk', items, submitResponse)

    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personalisation: {
          subject: `TEST FORM SUBMISSION: foobar`,
          body: 'ZHVtbXktcHJldmlldyAiIEhlbGxvIHdvcmxkICcgIUAv'
        }
      })
    )
  })
})
