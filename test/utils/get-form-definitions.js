import { readdir } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

export const formDir = resolve(import.meta.dirname, '../form/definitions')

/**
 * Get form definition filenames
 * @param {string} directory - Form definition directory
 * @returns {Promise<string[]>}
 */
export async function getForms(directory = formDir) {
  const files = await readdir(directory)
  return files.filter((file) => ['.json', '.js'].includes(extname(file)))
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
