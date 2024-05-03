import fs from 'node:fs'
import { join } from 'node:path'

import config from '~/src/server/config.js'
import { idFromFilename } from '~/src/server/plugins/engine/helpers.js'
import { plugin } from '~/src/server/plugins/engine/plugin.js'
import {
  loadPreConfiguredForms,
  type FormConfiguration
} from '~/src/server/plugins/engine/services/configurationService.js'

type ConfigureEnginePlugin = (
  formFileName?: string,
  formFilePath?: string
) => {
  plugin: any
  options: {
    modelOptions: {
      relativeTo: string
      previewMode: any
    }
    configs: {
      configuration: any
      id: string
    }[]
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
  let configs: FormConfiguration[]

  if (formFileName && formFilePath) {
    const formConfigPath = join(formFilePath, formFileName)

    configs = [
      {
        configuration: JSON.parse(fs.readFileSync(formConfigPath, 'utf8')),
        id: idFromFilename(formFileName)
      }
    ]
  } else {
    configs = loadPreConfiguredForms()
  }

  const modelOptions = {
    relativeTo: join(config.appDir, 'plugins/engine/views'),
    previewMode: options?.previewMode ?? config.previewMode
  }

  return {
    plugin,
    options: { modelOptions, configs, previewMode: config.previewMode }
  }
}
