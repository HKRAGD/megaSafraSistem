module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  testMatch: ['<rootDir>/src/tests/unit/**/*.test.js'],
  collectCoverageFrom: [
    'src/models/**/*.js',
    'src/middleware/**/*.js',
    '!src/tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
  maxWorkers: 1
}; 