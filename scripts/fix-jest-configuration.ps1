#!/usr/bin/env pwsh
<#
.SYNOPSIS
Fix Jest Configuration and Setup Testing Infrastructure

.DESCRIPTION
Resolves Jest configuration issues, implements parallel test execution,
and sets up comprehensive testing infrastructure to achieve 80% coverage.
#>

param(
    [switch]$DryRun,
    [string]$LogLevel = 'INFO',
    [int]$TargetCoverage = 80
)

function Write-TestLog {
    param($Message, $Level = 'INFO')
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] [TEST] $Message" -ForegroundColor $(
        switch ($Level) {
            'ERROR' { 'Red' }
            'WARN' { 'Yellow' }
            'SUCCESS' { 'Green' }
            default { 'White' }
        }
    )
}

Write-TestLog "Fixing Jest configuration and setting up testing infrastructure..." -Level 'INFO'

try {
    # 1. Create comprehensive Jest configuration
    $jestConfigPath = "jest.config.js"
    $jestConfig = @"
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Module resolution
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/' }),
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub'
  },
  
  // File patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)',
    '<rootDir>/tests/**/*.(test|spec).(ts|tsx|js|jsx)'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.ts',
    '@testing-library/jest-dom'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text', 'lcov', 'clover', 'json-summary'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/types/**/*',
    '!src/assets/**/*'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: ${TargetCoverage},
      functions: ${TargetCoverage},
      lines: ${TargetCoverage},
      statements: ${TargetCoverage}
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Parallel execution
  maxWorkers: '50%',
  
  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  },
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      ancestorSeparator: ' › ',
      uniqueOutputName: 'false',
      suiteNameTemplate: '{filepath}',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ]
};
"@

    if (-not $DryRun) {
        $jestConfig | Out-File -FilePath $jestConfigPath -Encoding UTF8
        Write-TestLog "✓ Jest configuration created" -Level 'SUCCESS'
    } else {
        Write-TestLog "DRY RUN: Would create Jest configuration" -Level 'WARN'
    }

    # 2. Create Jest setup file
    $setupDir = "tests/setup"
    $setupPath = "$setupDir/jest.setup.ts"
    
    if (-not (Test-Path $setupDir)) {
        New-Item -ItemType Directory -Path $setupDir -Force | Out-Null
    }
    
    $jestSetup = @"
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { vi } from 'vitest';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
});

// Mock environment variables
process.env.VITE_SUPABASE_URL = 'http://localhost:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'test-key';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '12345678-1234-1234-1234-123456789012',
    getRandomValues: (arr: any) => arr.fill(0),
  },
});

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
    realtime: {
      channel: vi.fn(() => ({
        on: vi.fn(),
        subscribe: vi.fn(),
      })),
    },
  })),
}));

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useParams: () => ({}),
  };
});

// Console suppression for tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('componentWillUpdate'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
export const createMockUser = () => ({
  id: '12345678-1234-1234-1234-123456789012',
  email: 'test@example.com',
  role: 'patient',
  profile: {
    first_name: 'Test',
    last_name: 'User',
    phone: '+1234567890',
  },
});

export const createMockCheckin = () => ({
  id: '12345678-1234-1234-1234-123456789012',
  user_id: '12345678-1234-1234-1234-123456789012',
  mood_score: 7,
  anxiety_level: 4,
  sleep_hours: 8,
  created_at: new Date().toISOString(),
});

export const mockSupabaseResponse = (data: any, error: any = null) => ({
  data,
  error,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
});
"@

    if (-not $DryRun) {
        $jestSetup | Out-File -FilePath $setupPath -Encoding UTF8
        Write-TestLog "✓ Jest setup file created" -Level 'SUCCESS'
    } else {
        Write-TestLog "DRY RUN: Would create Jest setup file" -Level 'WARN'
    }

    # 3. Create test utilities
    $testUtilsPath = "tests/utils/test-utils.tsx"
    $testUtils = @"
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock data generators
export const mockUser = {
  id: '12345678-1234-1234-1234-123456789012',
  email: 'test@example.com',
  role: 'patient' as const,
  profile: {
    first_name: 'Test',
    last_name: 'User',
    phone: '+1234567890',
  },
};

export const mockCheckin = {
  id: '12345678-1234-1234-1234-123456789012',
  user_id: '12345678-1234-1234-1234-123456789012',
  mood_score: 7,
  anxiety_level: 4,
  sleep_hours: 8,
  created_at: new Date().toISOString(),
};

// Custom matchers
export const customMatchers = {
  toBeInTheDocument: expect.extend({
    toBeInTheDocument(received) {
      const pass = received && document.body.contains(received);
      return {
        message: () =>
          pass
            ? `expected element not to be in the document`
            : `expected element to be in the document`,
        pass,
      };
    },
  }),
};

// Test data factories
export class TestDataFactory {
  static createUser(overrides: Partial<typeof mockUser> = {}) {
    return { ...mockUser, ...overrides };
  }

  static createCheckin(overrides: Partial<typeof mockCheckin> = {}) {
    return { ...mockCheckin, ...overrides };
  }

  static createEmergencyContact(overrides: any = {}) {
    return {
      id: '12345678-1234-1234-1234-123456789012',
      user_id: '12345678-1234-1234-1234-123456789012',
      name: 'Emergency Contact',
      phone: '+1234567890',
      relationship: 'friend',
      tier: 1,
      ...overrides,
    };
  }
}

// Async testing utilities
export const waitForLoadingToFinish = async () => {
  const { waitForElementToBeRemoved } = await import('@testing-library/react');
  return waitForElementToBeRemoved(
    () => document.querySelector('[data-testid="loading-spinner"]'),
    { timeout: 3000 }
  );
};

export const setupMockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
  window.IntersectionObserverEntry = jest.fn();
};
"@

    if (-not $DryRun) {
        $testUtils | Out-File -FilePath $testUtilsPath -Encoding UTF8
        Write-TestLog "✓ Test utilities created" -Level 'SUCCESS'
    } else {
        Write-TestLog "DRY RUN: Would create test utilities" -Level 'WARN'
    }

    # 4. Create parallel test execution configuration
    $parallelTestPath = "scripts/run-parallel-tests.js"
    $parallelTestScript = @"
#!/usr/bin/env node

const { spawn } = require('child_process');
const { cpus } = require('os');
const path = require('path');
const fs = require('fs');

/**
 * Parallel test execution with optimal worker distribution
 */
class ParallelTestRunner {
  constructor() {
    this.maxWorkers = Math.max(1, cpus().length - 1);
    this.testSuites = this.discoverTestSuites();
    this.results = {
      passed: 0,
      failed: 0,
      suites: [],
      startTime: Date.now(),
    };
  }

  discoverTestSuites() {
    const testDirs = [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
      'tests/**/*.test.{ts,tsx}',
      'tests/**/*.spec.{ts,tsx}',
    ];

    // This is a simplified discovery - in practice, use glob or similar
    return [
      { name: 'unit', pattern: 'src/**/*.test.{ts,tsx}', priority: 1 },
      { name: 'integration', pattern: 'tests/integration/**/*.test.{ts,tsx}', priority: 2 },
      { name: 'components', pattern: 'src/components/**/*.test.{ts,tsx}', priority: 1 },
      { name: 'services', pattern: 'src/services/**/*.test.{ts,tsx}', priority: 1 },
      { name: 'utils', pattern: 'src/utils/**/*.test.{ts,tsx}', priority: 1 },
      { name: 'hooks', pattern: 'src/hooks/**/*.test.{ts,tsx}', priority: 1 },
    ];
  }

  async runTestSuite(suite) {
    return new Promise((resolve, reject) => {
      console.log(`🧪 Running ${suite.name} tests...`);
      
      const jestArgs = [
        '--testPathPattern', suite.pattern,
        '--coverage',
        '--coverageDirectory', `coverage/${suite.name}`,
        '--passWithNoTests',
        '--silent',
        '--reporters', 'jest-silent-reporter',
        '--outputFile', `test-results/${suite.name}-results.json`,
      ];

      const jestProcess = spawn('npx', ['jest', ...jestArgs], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      jestProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      jestProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const startTime = Date.now();

      jestProcess.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const result = {
          suite: suite.name,
          success: code === 0,
          duration,
          stdout,
          stderr,
          exitCode: code,
        };

        if (code === 0) {
          console.log(`✅ ${suite.name} tests passed (${duration}ms)`);
          this.results.passed++;
        } else {
          console.log(`❌ ${suite.name} tests failed (${duration}ms)`);
          console.log(stderr);
          this.results.failed++;
        }

        this.results.suites.push(result);
        resolve(result);
      });

      jestProcess.on('error', (error) => {
        console.error(`Error running ${suite.name} tests:`, error);
        reject(error);
      });
    });
  }

  async runAllTests() {
    console.log(`🚀 Starting parallel test execution with ${this.maxWorkers} workers`);
    console.log(`📋 Test suites: ${this.testSuites.map(s => s.name).join(', ')}`);

    // Create results directory
    if (!fs.existsSync('test-results')) {
      fs.mkdirSync('test-results', { recursive: true });
    }

    // Sort by priority (lower numbers = higher priority)
    const sortedSuites = this.testSuites.sort((a, b) => a.priority - b.priority);

    try {
      // Run tests in parallel batches
      const batchSize = this.maxWorkers;
      const batches = [];
      
      for (let i = 0; i < sortedSuites.length; i += batchSize) {
        batches.push(sortedSuites.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        console.log(`\n🔄 Processing batch: ${batch.map(s => s.name).join(', ')}`);
        await Promise.all(batch.map(suite => this.runTestSuite(suite)));
      }

      this.generateReport();
      
      const success = this.results.failed === 0;
      console.log(`\n${success ? '✅' : '❌'} All tests ${success ? 'passed' : 'failed'}`);
      
      return success;

    } catch (error) {
      console.error('❌ Error during test execution:', error);
      return false;
    }
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.results.startTime;

    this.results.endTime = endTime;
    this.results.totalDuration = totalDuration;

    const reportPath = 'test-results/parallel-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

    console.log(`\n📊 Test Execution Summary:`);
    console.log(`   Total Duration: ${totalDuration}ms`);
    console.log(`   Suites Passed: ${this.results.passed}`);
    console.log(`   Suites Failed: ${this.results.failed}`);
    console.log(`   Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);
    console.log(`   Report saved: ${reportPath}`);
  }
}

async function main() {
  const runner = new ParallelTestRunner();
  const success = await runner.runAllTests();
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}
"@

    if (-not $DryRun) {
        $parallelTestScript | Out-File -FilePath $parallelTestPath -Encoding UTF8
        Write-TestLog "✓ Parallel test execution script created" -Level 'SUCCESS'
    } else {
        Write-TestLog "DRY RUN: Would create parallel test execution script" -Level 'WARN'
    }

    # 5. Update package.json with test scripts
    $packageJsonPath = "package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        
        $newScripts = @{
            'test:unit' = 'jest --testPathPattern="src/.*\\.(test|spec)\\.(ts|tsx)$"'
            'test:integration' = 'jest --testPathPattern="tests/integration"'
            'test:components' = 'jest --testPathPattern="src/components/.*\\.(test|spec)\\.(ts|tsx)$"'
            'test:services' = 'jest --testPathPattern="src/services/.*\\.(test|spec)\\.(ts|tsx)$"'
            'test:parallel' = 'node scripts/run-parallel-tests.js'
            'test:coverage' = 'jest --coverage --coverageThreshold="{\"global\":{\"branches\":80,\"functions\":80,\"lines\":80,\"statements\":80}}"'
            'test:watch' = 'jest --watch --coverage=false'
            'test:debug' = 'node --inspect-brk node_modules/.bin/jest --runInBand'
            'test:ci' = 'npm run test:parallel && npm run test:coverage'
        }
        
        $updated = $false
        foreach ($scriptName in $newScripts.Keys) {
            if (-not $packageJson.scripts.$scriptName) {
                $packageJson.scripts | Add-Member -NotePropertyName $scriptName -NotePropertyValue $newScripts[$scriptName]
                $updated = $true
            }
        }
        
        if ($updated -and -not $DryRun) {
            $packageJson | ConvertTo-Json -Depth 5 | Out-File -FilePath $packageJsonPath -Encoding UTF8
            Write-TestLog "✓ Package.json updated with test scripts" -Level 'SUCCESS'
        }
    }

    # 6. Run initial test to verify configuration
    if (-not $DryRun) {
        Write-TestLog "Running test configuration verification..." -Level 'INFO'
        
        try {
            # Create a simple test file to verify Jest works
            $verificationTestPath = "tests/setup/jest-verification.test.ts"
            $verificationTest = @"
describe('Jest Configuration Verification', () => {
  it('should be able to run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should have access to DOM testing utilities', () => {
    document.body.innerHTML = '<div data-testid="test-element">Test</div>';
    const element = document.querySelector('[data-testid="test-element"]');
    expect(element).toBeTruthy();
    expect(element?.textContent).toBe('Test');
  });

  it('should have mocked environment variables', () => {
    expect(process.env.VITE_SUPABASE_URL).toBe('http://localhost:54321');
    expect(process.env.VITE_SUPABASE_ANON_KEY).toBe('test-key');
  });
});
"@
            
            $verificationTest | Out-File -FilePath $verificationTestPath -Encoding UTF8
            
            # Run the verification test
            Write-TestLog "Running Jest verification test..." -Level 'INFO'
            & npx jest $verificationTestPath --no-coverage --verbose 2>$null
            
            if ($LASTEXITCODE -eq 0) {
                Write-TestLog "✓ Jest configuration verified successfully" -Level 'SUCCESS'
                
                # Clean up verification test
                Remove-Item $verificationTestPath -Force
            } else {
                Write-TestLog "⚠ Jest verification test failed - manual configuration may be needed" -Level 'WARN'
            }
        }
        catch {
            Write-TestLog "Error during Jest verification: $($_.Exception.Message)" -Level 'WARN'
        }
    }

    Write-TestLog "Jest configuration and testing infrastructure setup completed!" -Level 'SUCCESS'
    Write-TestLog "Next steps:" -Level 'INFO'
    Write-TestLog "1. Run: npm run test:parallel" -Level 'INFO'
    Write-TestLog "2. Check coverage: npm run test:coverage" -Level 'INFO'
    Write-TestLog "3. Watch mode: npm run test:watch" -Level 'INFO'
    Write-TestLog "Target coverage: ${TargetCoverage}%" -Level 'INFO'
    
    exit 0
    
} catch {
    Write-TestLog "Error fixing Jest configuration: $($_.Exception.Message)" -Level 'ERROR'
    Write-TestLog $_.ScriptStackTrace -Level 'ERROR'
    exit 1
}