/**
 * Nunjucks filter to get the page for a given path
 * @this {NunjucksContext}
 * @param {string} path - The path of the page
 */
export function page(path) {
  if (typeof path !== 'string') {
    return undefined
  }

  const { context } = this.ctx

  if (!context) {
    return undefined
  }

  const foundPage = context.pageMap.get(path)

  return foundPage
}

/**
 * @import { NunjucksContext } from '~/src/server/plugins/nunjucks/types.js'
 */
