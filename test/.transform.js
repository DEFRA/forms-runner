const { transformSync } = require('@babel/core')

/**
 * Apply Babel transforms to tests and TypeScript imports
 *
 * @param {string} content - File content
 * @param {string} filename - File name
 * @returns {import('@babel/core').BabelFileResult["code"]}
 */
function transform(content, filename) {
  if (filename.match(/node_modules/)) {
    return content
  }

  // Apply Babel transforms
  const transformed = transformSync(content, {
    filename: filename,
    sourceFileName: filename,
    sourceMap: 'inline',
    auxiliaryCommentBefore: '$lab:coverage:off$',
    auxiliaryCommentAfter: '$lab:coverage:on$'
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
