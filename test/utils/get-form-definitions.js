import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
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
  return files.filter((file) => extname(file) === '.json')
}

/**
 * Get form definition
 * @param {string} filename - Form definition filename
 * @param {string} [directory] - Form definition directory
 * @returns {Promise<FormDefinition>}
 */
export async function getForm(filename, directory = formDir) {
  // eslint-disable-next-line -- Allow JSON type 'any'
  return JSON.parse(await readFile(join(directory, filename), 'utf8'))
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
