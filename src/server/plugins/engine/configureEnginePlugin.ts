import { join, parse } from 'node:path'

import { type FormDefinition } from '@defra/forms-model'
import { type ServerRegisterPluginObject } from '@hapi/hapi'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  plugin,
  type PluginOptions
} from '~/src/server/plugins/engine/plugin.js'
import { type RouteConfig } from '~/src/server/types.js'

export const configureEnginePlugin = async ({
  formFileName,
  formFilePath,
  services,
  controllers
}: RouteConfig = {}): Promise<ServerRegisterPluginObject<PluginOptions>> => {
  let model: FormModel | undefined

  if (formFileName && formFilePath) {
    const definition = await getForm(join(formFilePath, formFileName))
    const { name } = parse(formFileName)

    model = new FormModel(definition, { basePath: name }, services, controllers)
  }

  return {
    plugin,
    options: { model, services }
  }
}

export async function getForm(importPath: string) {
  const { ext } = parse(importPath)

  const attributes: ImportAttributes = {
    type: ext === '.json' ? 'json' : 'module'
  }

  const formImport = import(importPath, { with: attributes }) as Promise<{
    default: FormDefinition
  }>

  const { default: definition } = await formImport
  return definition
}
