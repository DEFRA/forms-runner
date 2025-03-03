/**
 * Nunjucks filter to get the answer for a component
 * @this {NunjucksContext}
 * @param {string} name - The name of the component
 */
export function field(name) {
  if (typeof name !== 'string') {
    return
  }

  const { context } = this.ctx

  if (!context) {
    return
  }

  const component = context.componentMap.get(name)

  if (!component?.isFormComponent) {
    return
  }

  return component
}

/**
 * @import { NunjucksContext } from '~/src/server/plugins/nunjucks/types.js'
 */
