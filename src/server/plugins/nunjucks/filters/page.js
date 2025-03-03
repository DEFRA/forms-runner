/**
 * Nunjucks filter to get the page for a given path
 * @this {NunjucksContext}
 * @param {string} path - The path of the page
 */
export function page(path) {
  if (typeof path !== 'string') {
    return
  }

  const { context } = this.ctx

  if (!context) {
    return
  }

  const page = context.pageMap.get(path)

  return page
}

/**
 * @import { NunjucksContext } from '~/src/server/plugins/nunjucks/types.js'
 */
