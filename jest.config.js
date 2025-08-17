/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.tsx',
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        jsx: 'react-jsx',
        allowJs: true,
        strict: false,
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*']
        }
      }
    }]
  },
  // Relax type diagnostics during tests to allow flexible mocking
  globals: {
    'ts-jest': {
      diagnostics: false
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.js',
    '^@supabase/supabase-js$': '<rootDir>/tests/__mocks__/@supabase/supabase-js.ts',
    '^stripe$': '<rootDir>/tests/__mocks__/stripe.ts',
    '^react$': '<rootDir>/node_modules/react/index.js',
    '^react-dom$': '<rootDir>/node_modules/react-dom/index.js',
    '^react/jsx-runtime$': '<rootDir>/node_modules/react/jsx-runtime.js',
    '^react/jsx-dev-runtime$': '<rootDir>/node_modules/react/jsx-dev-runtime.js',
    '^serenity-provider-portal/node_modules/react(?:/(.*))?$': '<rootDir>/node_modules/react/$1',
    '^serenity-provider-portal/node_modules/react-dom(?:/(.*))?$': '<rootDir>/node_modules/react-dom/$1'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(jose)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  testPathIgnorePatterns: [
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/accessibility/',
    '<rootDir>/tests/database/'
  ]
};