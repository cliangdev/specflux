// Jest setup file for global test configuration
import fs from 'fs';
import path from 'path';

// Set test environment variables BEFORE any imports that might use them
process.env['NODE_ENV'] = 'test';
// Use in-memory database for tests
process.env['DATABASE_PATH'] = ':memory:';

// Suppress console.log during tests unless DEBUG is set
if (!process.env['DEBUG']) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

// Import db module AFTER setting environment variables
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dbModule = require('../db');

/**
 * Apply all migrations to the database
 */
function applyMigrations(db: ReturnType<typeof dbModule.getDatabase>): void {
  const migrationsDir = path.join(__dirname, '../../migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    // Extract UP section
    const upMatch = content.match(/--\s*UP\s*([\s\S]*?)(?:--\s*DOWN|$)/i);
    if (upMatch && upMatch[1]) {
      const upSql = upMatch[1].trim();
      if (upSql) {
        db.exec(upSql);
      }
    }
  }
}

// Reset and initialize database before each test file
beforeAll(() => {
  // Close any existing connection to force fresh in-memory database
  dbModule.closeDatabase();

  // Get fresh database connection (will use :memory: from env)
  const db = dbModule.getDatabase();

  // Apply all migrations
  applyMigrations(db);
});

// Clean up after each test file
afterAll(() => {
  dbModule.closeDatabase();
});
