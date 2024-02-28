/**
 * Babel config
 *
 * @satisfies {import('@babel/core').TransformOptions}
 */
module.exports = {
  plugins: ['@babel/plugin-syntax-import-attributes'],
  presets: [
    [
      '@babel/preset-typescript',
      {
        rewriteImportExtensions: true
      }
    ],

    [
      '@babel/preset-env',
      {
        browserslistEnv: 'node',
        bugfixes: true
      }
    ]
  ],
  env: {
    test: {
      plugins: [
        [
          'replace-import-extension',
          {
            extMapping: {
              '.cjs': '',
              '.js': ''
            }
          }
        ]
      ]
    }
  }
}
