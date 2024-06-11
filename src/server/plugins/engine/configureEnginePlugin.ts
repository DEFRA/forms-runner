import fs from 'node:fs'
import { join } from 'node:path'

import config from '~/src/server/config.js'
import { idFromFilename } from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { plugin } from '~/src/server/plugins/engine/plugin.js'

type ConfigureEnginePlugin = (
  formFileName?: string,
  formFilePath?: string
) => {
  plugin: any
  options: {
    model?: FormModel
  }
}

export const configureEnginePlugin: ConfigureEnginePlugin = (
  formFileName,
  formFilePath
) => {
  let model: FormModel | undefined

  const modelOptions = {
    relativeTo: join(config.appDir, 'plugins/engine/views')
  }

  if (formFileName && formFilePath) {
    const formConfigPath = join(formFilePath, formFileName)
    const definition = JSON.parse(fs.readFileSync(formConfigPath, 'utf8'))
    model = new FormModel(definition, {
      basePath: idFromFilename(formFileName),
      ...modelOptions
    })
  }

  return {
    plugin,
    options: { model }
  }
}
