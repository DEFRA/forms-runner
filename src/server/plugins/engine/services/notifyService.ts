import { type SubmitResponsePayload } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { escapeMarkdown } from '~/src/server/plugins/engine/components/helpers.js'
import { checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'
import { getFormatter } from '~/src/server/plugins/engine/outputFormatters/index.js'
import { type FormRequestPayload } from '~/src/server/routes/types.js'
import { sendNotification } from '~/src/server/utils/notify.js'

const templateId = config.get('notifyTemplateId')

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

  const formName = escapeMarkdown(model.name)
  const subject = formStatus.isPreview
    ? `TEST FORM SUBMISSION: ${formName}`
    : `Form submission: ${formName}`

  const outputAudience = model.def.output?.audience ?? 'human'
  const outputVersion = model.def.output?.version ?? '1'

  const outputFormatter = getFormatter(outputAudience, outputVersion)
  let body = outputFormatter(items, model, submitResponse, formStatus)

  // GOV.UK Notify transforms quotes into curly quotes, so we can't just send the raw payload
  // This is logic specific to Notify, so we include the logic here rather than in the formatter
  if (outputAudience === 'machine') {
    body = Buffer.from(body).toString('base64')
  }

  request.logger.info(logTags, 'Sending email')

  try {
    // Send submission email
    await sendNotification({
      templateId,
      emailAddress,
      personalisation: {
        subject,
        body
      }
    })

    request.logger.info(logTags, 'Email sent successfully')
  } catch (err) {
    request.logger.error(logTags, 'Error sending email', err)

    throw err
  }
}
