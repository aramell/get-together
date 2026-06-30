// Jest setup file for testing-library
require('@testing-library/jest-dom');

// Polyfills for Node.js globals required by browsers
if (typeof global !== 'undefined') {
  // TextEncoder/TextDecoder for pg library
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;

  // Mock next/server globals for API route testing
  if (!global.Request) {
    global.Request = class {
      constructor(input, init) {
        this.url = typeof input === 'string' ? input : input.url;
        this.headers = init?.headers || {};
      }
    };
  }

  if (!global.Response) {
    global.Response = class {
      constructor(body, init) {
        this.body = body;
        this.status = init?.status || 200;
        this.headers = init?.headers || new Map();
        this.json = async () => typeof body === 'string' ? JSON.parse(body) : body;
      }
    };
  }
}

// Only set up browser mocks in jsdom environment
if (typeof window !== 'undefined') {
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

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  };
}
