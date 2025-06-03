module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  testMatch: [
    '<rootDir>/src/tests/unit/**/*.test.js',
    '<rootDir>/src/tests/integration/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/models/**/*.js',
    'src/middleware/**/*.js',
    'src/controllers/**/*.js',
    'src/routes/**/*.js',
    'src/services/**/*.js',
    '!src/tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
  maxWorkers: 1
}; 