import fs from 'node:fs'
import { join } from 'node:path'

import config from '~/src/server/config.js'
import { idFromFilename } from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { plugin } from '~/src/server/plugins/engine/plugin.js'
// import {
//   loadPreConfiguredForms,
//   type FormConfiguration
// } from '~/src/server/plugins/engine/services/configurationService.js'

type ConfigureEnginePlugin = (
  formFileName?: string,
  formFilePath?: string
) => {
  plugin: any
  options: {
    model: any
    previewMode: boolean
  }
}

interface EngineOptions {
  previewMode?: boolean
}
export const configureEnginePlugin: ConfigureEnginePlugin = (
  formFileName,
  formFilePath,
  options?: EngineOptions
) => {
  // let configs: FormConfiguration[]
  let model

  const modelOptions = {
    relativeTo: join(config.appDir, 'plugins/engine/views'),
    previewMode: options?.previewMode ?? config.previewMode
  }

  if (formFileName && formFilePath) {
    const formConfigPath = join(formFilePath, formFileName)
    const definition = JSON.parse(fs.readFileSync(formConfigPath, 'utf8'))
    model = new FormModel(definition, {
      basePath: idFromFilename(formFileName),
      ...modelOptions
    })
    //   configs = [
    //     {
    //       configuration: JSON.parse(fs.readFileSync(formConfigPath, 'utf8')),
    //       id: idFromFilename(formFileName)
    //     }
    //   ]
    // } else {
    //   configs = loadPreConfiguredForms()
  }

  return {
    plugin,
    options: { model, previewMode: config.previewMode }
  }
}
