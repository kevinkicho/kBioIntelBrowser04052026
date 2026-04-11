import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      preset: 'ts-jest',
      testMatch: [
        '**/__tests__/lib/**/*.test.ts?(x)',
        '**/__tests__/api/**/*.test.ts?(x)',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'hooks',
      testEnvironment: 'jsdom',
      preset: 'ts-jest',
      testMatch: [
        '**/__tests__/hooks/**/*.test.ts?(x)',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      setupFiles: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx',
              esModuleInterop: true,
            },
          },
        ],
      },
    },
    {
      displayName: 'component',
      testEnvironment: 'jsdom',
      preset: 'ts-jest',
      testMatch: [
        '**/__tests__/components/**/*.test.ts?(x)',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      setupFiles: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx',
              esModuleInterop: true,
            },
          },
        ],
      },
      transformIgnorePatterns: [
        "node_modules/(?!d3|d3-array|d3-scale|d3-format|d3-interpolate|d3-time|d3-time-format|d3-shape|d3-path)/"
      ],
    },
  ],
}

export default createJestConfig(config)
