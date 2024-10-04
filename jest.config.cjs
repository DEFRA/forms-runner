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
  testMatch: ['**/*.test.{cjs,js,mjs,ts}'],
  reporters: CI
    ? [['github-actions', { silent: false }], 'summary']
    : ['default', 'summary'],
  collectCoverageFrom: ['src/**/*.{cjs,js,mjs,ts}'],
  modulePathIgnorePatterns: [
    '<rootDir>/.public/',
    '<rootDir>/.server/',
    '<rootDir>/coverage/'
  ],
  coverageDirectory: '<rootDir>/coverage',
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  transform: {
    '^.+\\.(cjs|js|mjs|ts)$': [
      'babel-jest',
      {
        rootMode: 'upward'
      }
    ]
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!@defra/forms-model/)']
}
