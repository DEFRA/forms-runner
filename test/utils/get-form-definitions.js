import { readdir } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const formDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../form/definitions'
)

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
