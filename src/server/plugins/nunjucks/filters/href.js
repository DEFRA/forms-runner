import { getPageHref } from '@defra/forms-engine-plugin/engine/helpers.js'

/**
 * Nunjucks filter to get the answer for a component
 * @this {NunjucksContext}
 * @param {string} path - The name of the component
 */
export function href(path) {
  if (typeof path !== 'string') {
    return undefined
  }

  const { context } = this.ctx

  if (!context) {
    return undefined
  }

  const page = context.pageMap.get(path)

  if (page === undefined) {
    return undefined
  }

  return getPageHref(page)
}

/**
 * @import { NunjucksContext } from '~/src/server/plugins/nunjucks/types.js'
 */
