// Jest setup file for global test configuration
import 'dotenv/config';
import { TextEncoder, TextDecoder } from 'util';
import { randomUUID as nodeRandomUUID } from 'crypto';

// Mock environment variables for testing
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock';
process.env.NODE_ENV = 'test';
// Mark integration context for certain helpers
if (!process.env.INTEGRATION_TEST) {
  process.env.INTEGRATION_TEST = '0';
}

// Polyfills for Node test environment
// TextEncoder/TextDecoder for libraries that expect Web APIs
if (!(global as any).TextEncoder) {
  (global as any).TextEncoder = TextEncoder;
}
if (!(global as any).TextDecoder) {
  (global as any).TextDecoder = TextDecoder as any;
}

// crypto.randomUUID polyfill for older Node in jsdom
if (!(global as any).crypto) {
  (global as any).crypto = {} as any;
}
if (!(global as any).crypto.randomUUID) {
  try {
    (global as any).crypto.randomUUID = nodeRandomUUID;
  } catch {
    (global as any).crypto.randomUUID = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

// Mock browser APIs with working storage
// Do not mock react here to avoid recursion; rely on moduleNameMapper
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock fetch
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  toBeOneOf(received: any, list: any[]) {
    const pass = list.includes(received);
    return {
      pass,
      message: () => `expected ${received} to be one of ${JSON.stringify(list)}`,
    };
  },
  toBeFinite(received: number) {
    const pass = Number.isFinite(received);
    return {
      pass,
      message: () => `expected ${received} to be finite`,
    };
  },
  toBeTypeOf(received: any, type: string) {
    const pass = typeof received === type;
    return {
      pass,
      message: () => `expected typeof ${received} to be ${type} but got ${typeof received}`,
    };
  },
});