/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  // Give each test suite its own timeout – integration tests hit a real PG
  testTimeout: 30_000,
  // Run suites serially so tests don't race on shared DB state
  runInBand: true,
  // Collect coverage from the real source files (not test helpers)
  collectCoverageFrom: [
    'routes/**/*.js',
    'controllers/**/*.js',
    'middleware/**/*.js',
    '!**/__mocks__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  // Show a summary per file
  verbose: true,
}
