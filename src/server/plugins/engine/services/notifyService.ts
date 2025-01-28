import { type SubmitResponsePayload } from '@defra/forms-model'
import { addDays, format } from 'date-fns'

import { config } from '~/src/config/index.js'
import {
  escapeMarkdown,
  getAnswer
} from '~/src/server/plugins/engine/components/helpers.js'
import { checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'
import { type FormRequestPayload } from '~/src/server/routes/types.js'
import { sendNotification } from '~/src/server/utils/notify.js'

const designerUrl = config.get('designerUrl')
const templateId = config.get('notifyTemplateId')

function getPersonalisation(
  items: DetailItem[],
  model: FormModel,
  submitResponse: SubmitResponsePayload,
  formStatus: ReturnType<typeof checkFormStatus>
) {
  const { files } = submitResponse.result

  /**
   * @todo Refactor this below but the code to
   * generate the question and answers works for now
   */
  const now = new Date()
  const formattedNow = `${format(now, 'h:mmaaa')} on ${format(now, 'd MMMM yyyy')}`

  const fileExpiryDate = addDays(now, 30)
  const formattedExpiryDate = `${format(fileExpiryDate, 'h:mmaaa')} on ${format(fileExpiryDate, 'eeee d MMMM yyyy')}`

  const formName = escapeMarkdown(model.name)
  const subject = formStatus.isPreview
    ? `TEST FORM SUBMISSION: ${formName}`
    : `Form submission: ${formName}`

  const lines: string[] = []

  lines.push(
    `^ For security reasons, the links in this email expire at ${escapeMarkdown(formattedExpiryDate)}\n`
  )

  if (formStatus.isPreview) {
    lines.push(`This is a test of the ${formName} ${formStatus.state} form.\n`)
  }

  lines.push(`Form submitted at ${escapeMarkdown(formattedNow)}.\n`)
  lines.push('---\n')

  items.forEach((item) => {
    const label = escapeMarkdown(item.label)

    lines.push(`## ${label}\n`)

    if ('subItems' in item) {
      const filename = escapeMarkdown(`Download ${label} (CSV)`)
      const fileId = files.repeaters[item.name]

      lines.push(`[${filename}](${designerUrl}/file-download/${fileId})\n`)
    } else {
      lines.push(
        getAnswer(item.field, item.state, {
          format: 'email'
        })
      )
    }

    lines.push('---\n')
  })

  const filename = escapeMarkdown('Download main form (CSV)')
  lines.push(`[${filename}](${designerUrl}/file-download/${files.main})\n`)

  return {
    body: lines.join('\n'),
    subject
  }
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
