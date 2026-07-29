/**
 * Jest config (plain JS so CI / npm ci does not need ts-node to parse the config).
 * Keep in sync with docs that mention jest config — prefer this file over .ts.
 */
const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  coverageProvider: 'v8',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/mocks/',
    '<rootDir>/__tests__/utils/',
    '<rootDir>/e2e/',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!d3|d3-array|d3-scale|d3-format|d3-interpolate|d3-time|d3-time-format|d3-shape|d3-path)',
  ],
}

module.exports = createJestConfig(config)
