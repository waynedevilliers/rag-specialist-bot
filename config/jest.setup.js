require('@testing-library/jest-dom');

// Load real environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Only set fallback API key if none exists
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'test-api-key';
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};