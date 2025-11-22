#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';
import { getDatabase, closeDatabase } from './index';

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

interface MigrationRecord {
  id: number;
  name: string;
  applied_at: string;
}

/**
 * Initialize migrations table if it doesn't exist
 */
function initMigrationsTable(db: ReturnType<typeof getDatabase>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get list of applied migrations
 */
function getAppliedMigrations(db: ReturnType<typeof getDatabase>): string[] {
  const rows = db.prepare('SELECT name FROM _migrations ORDER BY id').all() as MigrationRecord[];
  return rows.map((row) => row.name);
}

/**
 * Get all migration files sorted by name
 */
function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('No migrations directory found');
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

/**
 * Parse migration file into UP and DOWN sections
 */
function parseMigration(content: string): { up: string; down: string } {
  const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
  const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);

  return {
    up: upMatch?.[1]?.trim() ?? '',
    down: downMatch?.[1]?.trim() ?? '',
  };
}

/**
 * Run pending migrations
 */
export function runMigrations(verbose = true): void {
  const db = getDatabase();
  initMigrationsTable(db);

  const applied = new Set(getAppliedMigrations(db));
  const files = getMigrationFiles();

  const pending = files.filter((file) => !applied.has(file));

  if (pending.length === 0) {
    if (verbose) console.log('No pending migrations');
    return;
  }

  if (verbose) console.log(`Running ${pending.length} migration(s)...`);

  for (const file of pending) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { up } = parseMigration(content);

    if (!up) {
      console.error(`Migration ${file} has no UP section`);
      process.exit(1);
    }

    if (verbose) console.log(`  Applying: ${file}`);

    db.transaction(() => {
      // Execute migration
      db.exec(up);

      // Record migration
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    })();
  }

  if (verbose) console.log('Migrations complete');
}

/**
 * Rollback the last migration
 */
export function rollbackMigration(verbose = true): void {
  const db = getDatabase();
  initMigrationsTable(db);

  const applied = getAppliedMigrations(db);

  if (applied.length === 0) {
    if (verbose) console.log('No migrations to rollback');
    return;
  }

  const lastMigration = applied[applied.length - 1]!;
  const filePath = path.join(MIGRATIONS_DIR, lastMigration);

  if (!fs.existsSync(filePath)) {
    console.error(`Migration file not found: ${lastMigration}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { down } = parseMigration(content);

  if (!down) {
    console.error(`Migration ${lastMigration} has no DOWN section`);
    process.exit(1);
  }

  if (verbose) console.log(`Rolling back: ${lastMigration}`);

  db.transaction(() => {
    // Execute rollback
    db.exec(down);

    // Remove migration record
    db.prepare('DELETE FROM _migrations WHERE name = ?').run(lastMigration);
  })();

  if (verbose) console.log('Rollback complete');
}

// CLI entry point
if (require.main === module) {
  try {
    runMigrations();
  } finally {
    closeDatabase();
  }
}
