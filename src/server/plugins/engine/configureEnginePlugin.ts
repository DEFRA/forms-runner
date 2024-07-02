import fs from 'node:fs'
import { join } from 'node:path'

import { type FormDefinition } from '@defra/forms-model'
import { type ServerRegisterPluginObject } from '@hapi/hapi'

import { idFromFilename } from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  plugin,
  type PluginOptions
} from '~/src/server/plugins/engine/plugin.js'

export const configureEnginePlugin = (
  formFileName?: string,
  formFilePath?: string
): ServerRegisterPluginObject<PluginOptions> => {
  let model: FormModel | undefined

  if (formFileName && formFilePath) {
    const formConfigPath = join(formFilePath, formFileName)

    const definition = JSON.parse(
      fs.readFileSync(formConfigPath, 'utf8')
    ) as FormDefinition

    model = new FormModel(definition, {
      basePath: idFromFilename(formFileName)
    })
  }

  return {
    plugin,
    options: { model }
  }
}
