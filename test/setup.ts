// Jest setup file for the x402-mcp-extension project

// Configure Jest to handle TypeScript and ES modules
import { jest } from '@jest/globals';

// Global test configuration
beforeAll(() => {
  // Set up any global test configuration
  jest.setTimeout(10000); // 10 second timeout for tests
});

afterAll(() => {
  // Clean up any global resources
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}; 