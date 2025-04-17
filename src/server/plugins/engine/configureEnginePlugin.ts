import { join, parse } from 'node:path'

import { type FormDefinition } from '@defra/forms-model'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  plugin,
  type PluginOptions
} from '~/src/server/plugins/engine/plugin.js'
import { type RouteConfig } from '~/src/server/types.js'

const FORM_PREFIX = '/form'

export const configureEnginePlugin = async ({
  formFileName,
  formFilePath,
  services,
  controllers
}: RouteConfig = {}): Promise<
  [
    { plugin: typeof plugin; options: PluginOptions },
    { routes: { prefix: string } }
  ]
> => {
  let model: FormModel | undefined

  if (formFileName && formFilePath) {
    const definition = await getForm(join(formFilePath, formFileName))
    const { name } = parse(formFileName)

    const initialBasePath = `${FORM_PREFIX.substring(1)}/${name}`

    model = new FormModel(
      definition,
      { basePath: initialBasePath },
      services,
      controllers
    )
  }

  const pluginObject = { plugin, options: { model, services, controllers } }
  const routeOptions = { routes: { prefix: FORM_PREFIX } }
  return [pluginObject, routeOptions]
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
