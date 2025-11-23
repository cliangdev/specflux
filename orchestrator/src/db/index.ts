import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
  verbose?: boolean;
}

const DEFAULT_DB_PATH = path.join(process.cwd(), 'data', 'specflux.db');

/**
 * Get or create the database connection
 */
export function getDatabase(config?: Partial<DatabaseConfig>): Database.Database {
  if (db) return db;

  const dbPath = config?.path ?? process.env['DATABASE_PATH'] ?? DEFAULT_DB_PATH;

  // Ensure directory exists (skip for in-memory database)
  if (dbPath !== ':memory:') {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  db = new Database(dbPath, {
    readonly: config?.readonly ?? false,
    verbose: config?.verbose ? console.log : undefined,
  });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better concurrent access (skip for in-memory)
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }

  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Get database for testing (in-memory)
 */
export function getTestDatabase(): Database.Database {
  const testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  return testDb;
}

export { Database };
