import { type SubmitResponsePayload } from '@defra/forms-model'

import { type checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'
import { format as formatHumanV1 } from '~/src/server/plugins/engine/outputFormatters/human/v1.js'
import { format as formatMachineV1 } from '~/src/server/plugins/engine/outputFormatters/machine/v1.js'
import { format as formatMachineV2 } from '~/src/server/plugins/engine/outputFormatters/machine/v2.js'

type Formatter = (
  items: DetailItem[],
  model: FormModel,
  submitResponse: SubmitResponsePayload,
  formStatus: ReturnType<typeof checkFormStatus>
) => string

const formatters: Record<
  string,
  Record<string, Formatter | undefined> | undefined
> = {
  human: {
    '1': formatHumanV1
  },
  machine: {
    '1': formatMachineV1,
    '2': formatMachineV2
  }
}

export function getFormatter(audience: string, version: string) {
  const versions = formatters[audience]

  if (!versions) {
    throw new Error('Unknown audience')
  }

  const formatter = versions[version]

  if (!formatter) {
    throw new Error('Unknown version')
  }

  return formatter
}
