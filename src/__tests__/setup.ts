//import { jest } from '@jest/globals';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.DATABASE_URL = 'test-database-url';

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock external dependencies
jest.mock('ws');
jest.mock('openai');
jest.mock('jsonwebtoken');

// Mock database connection
jest.mock('../db/config', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock DAOs
jest.mock('../dao', () => ({
  MessageDao: {
    create: jest.fn(),
    findByMessageId: jest.fn(),
    findBySessionId: jest.fn(),
    findByUserId: jest.fn(),
    findRecent: jest.fn(),
    deleteById: jest.fn(),
  },
  ApiCallDao: {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findRecent: jest.fn(),
    getStats: jest.fn(),
    deleteOlder: jest.fn(),
  },
  UserDao: {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    existsByEmail: jest.fn(),
  },
}));


// Setup and teardown
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Restore console after all tests
  global.console = originalConsole;
});

test('1+1=2', () => {
  expect(1+1).toBe(2);
});
