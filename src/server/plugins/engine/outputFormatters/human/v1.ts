import { type SubmitResponsePayload } from '@defra/forms-model'
import { addDays, format as dateFormat } from 'date-fns'

import { config } from '~/src/config/index.js'
import {
  escapeMarkdown,
  getAnswer
} from '~/src/server/plugins/engine/components/helpers.js'
import { type checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'

const designerUrl = config.get('designerUrl')

export function format(
  items: DetailItem[],
  model: FormModel,
  submitResponse: SubmitResponsePayload,
  formStatus: ReturnType<typeof checkFormStatus>
) {
  const { files } = submitResponse.result

  const formName = escapeMarkdown(model.name)

  /**
   * @todo Refactor this below but the code to
   * generate the question and answers works for now
   */
  const now = new Date()
  const formattedNow = `${dateFormat(now, 'h:mmaaa')} on ${dateFormat(now, 'd MMMM yyyy')}`

  const fileExpiryDate = addDays(now, 90)
  const formattedExpiryDate = `${dateFormat(fileExpiryDate, 'h:mmaaa')} on ${dateFormat(fileExpiryDate, 'eeee d MMMM yyyy')}`

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

  return lines.join('\n')
}
