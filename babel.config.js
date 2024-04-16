const { NODE_ENV } = process.env

/**
 * Babel config
 *
 * @satisfies {import('@babel/core').TransformOptions}
 */
module.exports = {
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '~': '.'
        }
      }
    ],
    '@babel/plugin-syntax-import-attributes'
  ],
  presets: [
    '@babel/preset-typescript',
    [
      '@babel/preset-env',
      {
        browserslistEnv: 'node',
        bugfixes: true,
        modules: NODE_ENV === 'test' ? 'auto' : false
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
