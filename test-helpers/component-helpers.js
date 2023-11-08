import path from 'path'
import nunjucks from 'nunjucks'
import { load } from 'cheerio'
import { camelCase } from 'lodash'
import * as filters from '~/src/config/nunjucks/filters'
import * as globals from '~/src/config/nunjucks/globals'

const nunjucksTestEnv = nunjucks.configure(
  [
    'node_modules/govuk-frontend/',
    path.normalize(
      path.resolve(__dirname, '..', 'src', 'server', 'common', 'templates')
    ),
    path.normalize(
      path.resolve(__dirname, '..', 'src', 'server', 'common', 'components')
    )
  ],
  {
    trimBlocks: true,
    lstripBlocks: true
  }
)

Object.keys(globals).forEach((global) => {
  nunjucksTestEnv.addFilter(global, globals[global])
})

Object.keys(filters).forEach((filter) => {
  nunjucksTestEnv.addFilter(filter, filters[filter])
})

function renderComponent(componentName, params, callBlock) {
  const macroPath = `${componentName}/macro.njk`
  const macroName = `app${
    componentName.charAt(0).toUpperCase() + camelCase(componentName.slice(1))
  }`
  const macroParams = JSON.stringify(params, null, 2)
  let macroString = `{%- from "${macroPath}" import ${macroName} -%}`

  if (callBlock) {
    macroString += `{%- call ${macroName}(${macroParams}) -%}${callBlock}{%- endcall -%}`
  } else {
    macroString += `{{- ${macroName}(${macroParams}) -}}`
  }

  return load(nunjucksTestEnv.renderString(macroString))
}

export { renderComponent }
