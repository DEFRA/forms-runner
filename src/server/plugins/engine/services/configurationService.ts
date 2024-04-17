import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { idFromFilename } from '../helpers.js'

const FORMS_FOLDER = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../forms'
)

export type FormConfiguration = {
  configuration: any // TODO
  id: string
}

/**
 * Reads the runner/src/server/forms directory for JSON files. The forms that are found will be loaded up at localhost:3009/id
 */
export const loadPreConfiguredForms = (): FormConfiguration[] => {
  const configFiles = fs
    .readdirSync(FORMS_FOLDER)
    .filter((filename: string) => filename.indexOf('.json') >= 0)

  return configFiles.map((configFile) => {
    const dataFilePath = join(FORMS_FOLDER, configFile)
    const configuration = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'))
    const id = idFromFilename(configFile)
    return { configuration, id }
  })
}
