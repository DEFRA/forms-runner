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
  testMatch: ['<rootDir>/src/**/*.test.{cjs,js,mjs,ts}'],
  reporters: CI
    ? [['github-actions', { silent: false }], 'summary']
    : ['default', 'summary'],
  collectCoverageFrom: ['<rootDir>/src/**/*.{cjs,js,mjs,ts}'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.server',
    '<rootDir>/src/client',
    '<rootDir>/test'
  ],
  coverageDirectory: '<rootDir>/coverage',
  setupFiles: ['<rootDir>/jest.setup.cjs'],
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
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!@defra/forms-model/)']
}
