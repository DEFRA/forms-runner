/**
 * Returns if the given path is relative or not.
 * @param {string} path - The path to check.
 */
export function isPathRelative(path) {
  return (path ?? '').startsWith('/')
}
