import { getPageHref } from '~/src/server/plugins/engine/index.js'

/**
 * Nunjucks filter to get the answer for a component
 * @this {NunjucksContext}
 * @param {string} path - The name of the component
 */
export function href(path) {
  if (typeof path !== 'string') {
    return
  }

  const { context } = this.ctx

  if (!context) {
    return
  }

  const page = context.pageMap.get(path)

  if (page === undefined) {
    return
  }

  return getPageHref(page)
}

/**
 * @import { NunjucksContext } from '~/src/server/plugins/nunjucks/types.js'
 */
