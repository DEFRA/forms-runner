import { environment } from '~/src/server/plugins/nunjucks/environment.js'

/**
 * Render Nunjucks macro
 * @param {string} macroName
 * @param {string} macroPath
 * @param {RenderOptions & MacroOptions} [options]
 */
export function macro(macroName, macroPath, options) {
  const macroParams = JSON.stringify(options?.params, undefined, 2)
  let macroString = `{%- from "${macroPath}" import ${macroName} -%}`

  if (options?.callBlock) {
    macroString += `{%- call ${macroName}(${macroParams}) -%}${options.callBlock}{%- endcall -%}`
  } else {
    macroString += `{{- ${macroName}(${macroParams}) -}}`
  }

  return string(macroString, options)
}

/**
 * Render Nunjucks code
 * @param {string} viewString - Nunjucks string to render
 * @param {RenderOptions} [options]
 */
export function string(viewString, options) {
  return environment.renderString(viewString, options?.context ?? {})
}

/**
 * Render Nunjucks view
 * @param {string} viewPath
 * @param {RenderOptions} [options]
 */
export function view(viewPath, options) {
  return environment.render(viewPath, options?.context)
}

/**
 * @import { MacroOptions, RenderOptions } from '~/src/server/plugins/nunjucks/types.js'
 */
