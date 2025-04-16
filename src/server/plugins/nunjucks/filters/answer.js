import { getAnswer } from '@defra/forms-engine-plugin/engine/components/helpers.js'

/**
 * Nunjucks filter to get the answer for a component
 * @this {NunjucksContext}
 * @param {string} name - The name of the component to check
 */
export function answer(name) {
  const { context } = this.ctx

  if (!context) {
    return undefined
  }

  const component = context.componentMap.get(name)

  if (!component?.isFormComponent) {
    return undefined
  }

  return getAnswer(/** @type {Field} */ (component), context.relevantState)
}

/**
 * @import { NunjucksContext } from '~/src/server/plugins/nunjucks/types.js'
 * @import { Field } from '@defra/forms-engine-plugin/engine/components/helpers.js'
 */
