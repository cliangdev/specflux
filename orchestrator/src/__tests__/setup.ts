// Jest setup file for global test configuration

// Suppress console.log during tests unless DEBUG is set
if (!process.env['DEBUG']) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

// Set test environment variables
process.env['NODE_ENV'] = 'test';
