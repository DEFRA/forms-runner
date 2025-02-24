import { evaluateTemplate } from '~/src/server/plugins/engine/helpers.js'

/**
 * Nunjucks filter to evaluate a liquid template.
 * Current just used in `src/server/views/layout.html#LN37` for the pageTitle
 * @this {NunjucksContext}
 * @param {string} template
 */
export function evaluate(template) {
  const { context } = this.ctx

  if (!context || typeof template !== 'string') {
    return template
  }

  return evaluateTemplate(template, context)
}

/**
 * @import { NunjucksContext } from '~/src/server/plugins/nunjucks/types.js'
 */
