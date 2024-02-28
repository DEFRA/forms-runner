/**
 * ESLint config
 *
 * @type {import('eslint').ESLint.ConfigData}
 */
module.exports = {
  ignorePatterns: ['**/dist/**', '**/public/**', 'node_modules'],
  overrides: [
    {
      extends: [
        'standard',
        'eslint:recommended',
        'plugin:import/recommended',
        'plugin:promise/recommended',
        'prettier'
      ],
      files: ['**/*.{cjs,js,mjs,ts}'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest'
      },
      plugins: ['@typescript-eslint', 'import', 'promise'],
      settings: {
        'import/parsers': {
          '@typescript-eslint/parser': ['.cjs', '.js', '.mjs', '.ts']
        },
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true
          }
        }
      }
    }
  ],
  root: true
}
