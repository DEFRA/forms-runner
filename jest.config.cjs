const { CI } = process.env

/**
 * Jest config
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  resetMocks: true,
  resetModules: true,
  restoreMocks: true,
  clearMocks: true,
  silent: true,
  testMatch: [
    '<rootDir>/src/**/*.test.{cjs,js,mjs,ts}',
    '<rootDir>/test/**/*.test.{cjs,js,mjs,ts}'
  ],
  reporters: CI
    ? [['github-actions', { silent: false }], 'summary']
    : ['default', 'summary'],
  collectCoverageFrom: ['<rootDir>/src/**/*.{cjs,js,mjs,ts}'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.server',
    '<rootDir>/src/client/(?!javascripts)',
    '<rootDir>/src/client/javascripts/application.js',
    '<rootDir>/test'
  ],
  coverageDirectory: '<rootDir>/coverage',
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  setupFilesAfterEnv: ['<rootDir>/jest.environment.js', 'jest-extended/all'],
  transform: {
    '^.+\\.(cjs|js|mjs|ts)$': [
      'babel-jest',
      {
        browserslistEnv: 'node',
        plugins: ['transform-import-meta'],
        rootMode: 'upward'
      }
    ]
  },

  // Enable Babel transforms for node_modules
  // See: https://jestjs.io/docs/ecmascript-modules
  transformIgnorePatterns: [
    `node_modules/(?!${[
      '@defra/forms-model/.*',
      'nanoid', // Supports ESM only
      'slug', // Supports ESM only
      '@defra/hapi-tracing' // Supports ESM only|
    ].join('|')}/)`
  ],
  testTimeout: 10000,
  forceExit: true
}
