const { transformSync } = require('@babel/core')

/**
 * Apply Babel transforms to tests and TypeScript imports
 *
 * @param {string} content - File content
 * @param {string} filename - File name
 * @returns {import('@babel/core').BabelFileResult["code"]}
 */
function transform(content, filename) {
  const isTest = filename.match(/\.test\.m?[jt]s/)
  const isDependency = filename.match(/node_modules/)

  if (isDependency) {
    return content
  }

  // Apply Babel transforms
  const transformed = transformSync(content, {
    filename: filename,
    sourceFileName: filename,
    sourceMap: 'inline',

    // Skip coverage for test files
    auxiliaryCommentBefore: !isTest ? '$lab:coverage:off$' : undefined,
    auxiliaryCommentAfter: !isTest ? '$lab:coverage:on$' : undefined
  })

  return transformed?.code ?? content
}

/**
 * Transformers for supported extensions
 *
 * @type {import('@hapi/lab').script.Transformer[]}
 */
module.exports = ['.cjs', '.js', '.mjs', '.ts'].map((ext) => {
  return { ext, transform }
})
