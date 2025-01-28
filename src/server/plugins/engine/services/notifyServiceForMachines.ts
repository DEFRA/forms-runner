import { type SubmitResponsePayload } from '@defra/forms-model'
import { addDays, format } from 'date-fns'
import { object } from 'joi'

import { config } from '~/src/config/index.js'
import {
  escapeMarkdown,
  getAnswer
} from '~/src/server/plugins/engine/components/helpers.js'
import { checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import {
  type DetailItem,
  type DetailItemField
} from '~/src/server/plugins/engine/models/types.js'
import { type FormRequestPayload } from '~/src/server/routes/types.js'
import { sendNotification } from '~/src/server/utils/notify.js'

const templateId = config.get('notifyTemplateId')

function getPersonalisation(
  items: DetailItem[],
  model: FormModel,
  submitResponse: SubmitResponsePayload,
  formStatus: ReturnType<typeof checkFormStatus>
) {
  const now = new Date()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const itemsRendered = Object.fromEntries(items.map(renderDetailItem))

  const data = {
    meta: {
      schemaVersion: '1',
      timestamp: now.toISOString()
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    data: itemsRendered
  }

  const formName = escapeMarkdown(model.name)
  const subject = formStatus.isPreview
    ? `TEST FORM SUBMISSION: ${formName}`
    : `Form submission: ${formName}`
  const body = JSON.stringify(data)

  return {
    body,
    subject
  }
}

function renderDetailItem(item: DetailItem) {
  if ('subItems' in item) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return [
      item.label,
      item.subItems.map((subitem) =>
        Object.fromEntries(
          subitem.map((subsubitem) => [
            subsubitem.label,
            getItemEntry(subsubitem)
          ])
        )
      )
    ]
  } else {
    return [item.label, getItemEntry(item)]
  }
}

/**
 * Get an entry compatible with Object.fromEntries
 */
function getItemEntry(item: DetailItemField): string {
  return getAnswer(item.field, item.state, {
    format: 'data'
  })
}

export async function submit(
  request: FormRequestPayload,
  model: FormModel,
  emailAddress: string,
  items: DetailItem[],
  submitResponse: SubmitResponsePayload
) {
  const logTags = ['submit', 'email']
  const { path } = request
  const formStatus = checkFormStatus(path)

  // Get submission email personalisation
  request.logger.info(logTags, 'Getting personalisation data')

  const personalisation = getPersonalisation(
    items,
    model,
    submitResponse,
    formStatus
  )

  request.logger.info(logTags, 'Sending email')

  try {
    // Send submission email
    await sendNotification({
      templateId,
      emailAddress,
      personalisation
    })

    request.logger.info(logTags, 'Email sent successfully')
  } catch (err) {
    request.logger.error(logTags, 'Error sending email', err)

    throw err
  }
}
