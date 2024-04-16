/**
 * Jest config
 *
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  resetModules: true,
  restoreMocks: true,
  clearMocks: true,
  silent: true,
  testMatch: ['**/*.test.{cjs,js,mjs,ts}'],
  reporters: ['default', ['github-actions', { silent: false }], 'summary'],
  collectCoverageFrom: ['src/**/*.{cjs,js,mjs,ts}'],
  modulePathIgnorePatterns: [
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/public/'
  ],
  coverageDirectory: '<rootDir>/coverage',
  transform: {
    '^.+\\.(mjs|ts)$': [
      'babel-jest',
      {
        rootMode: 'upward'
      }
    ]
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!@defra/forms-model/)']
}
