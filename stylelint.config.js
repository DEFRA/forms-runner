export default {
  extends: 'stylelint-config-gds/scss',
  ignoreFiles: ['**/dist/**'],
  overrides: [
    {
      customSyntax: 'postcss-scss',
      files: ['**/*.scss']
    }
  ]
}
