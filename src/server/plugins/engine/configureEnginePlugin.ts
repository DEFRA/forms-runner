import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { plugin } from './plugin.js'

import {
  loadPreConfiguredForms,
  FormConfiguration
} from './services/configurationService.js'
import { idFromFilename } from './helpers.js'
import config from '../../config.js'

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

type EngineOptions = {
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
    relativeTo: dirname(fileURLToPath(import.meta.url)),
    previewMode: options?.previewMode ?? config.previewMode
  }

  return {
    plugin,
    options: { modelOptions, configs, previewMode: config.previewMode }
  }
}
