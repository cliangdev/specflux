import Database from 'better-sqlite3';
import { getTestDatabase } from '../../db';

// Re-implement parseMigration for testing (it's not exported from migrate.ts)
function parseMigration(content: string): { up: string; down: string } {
  const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
  const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);

  return {
    up: upMatch?.[1]?.trim() ?? '',
    down: downMatch?.[1]?.trim() ?? '',
  };
}

interface MigrationRecord {
  id: number;
  name: string;
  applied_at: string;
}

/**
 * Test helper: Initialize migrations table
 */
function initMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Test helper: Get applied migrations
 */
function getAppliedMigrations(db: Database.Database): string[] {
  const rows = db.prepare('SELECT name FROM _migrations ORDER BY id').all() as MigrationRecord[];
  return rows.map((row) => row.name);
}

/**
 * Test helper: Apply a migration
 */
function applyMigration(db: Database.Database, name: string, upSql: string): void {
  db.transaction(() => {
    db.exec(upSql);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(name);
  })();
}

/**
 * Test helper: Rollback a migration
 */
function rollbackMigration(db: Database.Database, name: string, downSql: string): void {
  db.transaction(() => {
    db.exec(downSql);
    db.prepare('DELETE FROM _migrations WHERE name = ?').run(name);
  })();
}

/**
 * Test helper: Check if table exists
 */
function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(tableName);
  return !!result;
}

/**
 * Test helper: Get all tables
 */
function getAllTables(db: Database.Database): string[] {
  const rows = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}

describe('Migration System', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getTestDatabase();
    initMigrationsTable(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('parseMigration', () => {
    it('should parse UP and DOWN sections correctly', () => {
      const content = `-- UP
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

-- DOWN
DROP TABLE users;`;

      const result = parseMigration(content);

      expect(result.up).toBe(
        'CREATE TABLE users (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL\n);'
      );
      expect(result.down).toBe('DROP TABLE users;');
    });

    it('should handle migration with only UP section', () => {
      const content = `-- UP
CREATE TABLE logs (id INTEGER PRIMARY KEY);`;

      const result = parseMigration(content);

      expect(result.up).toBe('CREATE TABLE logs (id INTEGER PRIMARY KEY);');
      expect(result.down).toBe('');
    });

    it('should handle case-insensitive markers', () => {
      const content = `-- up
CREATE TABLE test (id INTEGER);

-- down
DROP TABLE test;`;

      const result = parseMigration(content);

      expect(result.up).toBe('CREATE TABLE test (id INTEGER);');
      expect(result.down).toBe('DROP TABLE test;');
    });

    it('should handle complex multi-statement migrations', () => {
      const content = `-- UP
CREATE TABLE a (id INTEGER PRIMARY KEY);
CREATE TABLE b (id INTEGER PRIMARY KEY, a_id INTEGER REFERENCES a(id));
CREATE INDEX idx_b_a_id ON b(a_id);

-- DOWN
DROP INDEX idx_b_a_id;
DROP TABLE b;
DROP TABLE a;`;

      const result = parseMigration(content);

      expect(result.up).toContain('CREATE TABLE a');
      expect(result.up).toContain('CREATE TABLE b');
      expect(result.up).toContain('CREATE INDEX');
      expect(result.down).toContain('DROP INDEX');
      expect(result.down).toContain('DROP TABLE b');
      expect(result.down).toContain('DROP TABLE a');
    });

    it('should return empty strings for invalid content', () => {
      const content = 'Some random content without markers';

      const result = parseMigration(content);

      expect(result.up).toBe('');
      expect(result.down).toBe('');
    });
  });

  describe('migrations table', () => {
    it('should create _migrations table', () => {
      expect(tableExists(db, '_migrations')).toBe(true);
    });

    it('should start with no applied migrations', () => {
      const applied = getAppliedMigrations(db);
      expect(applied).toEqual([]);
    });
  });

  describe('applying migrations', () => {
    it('should apply a single migration', () => {
      const migration = `-- UP
CREATE TABLE test_users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL
);

-- DOWN
DROP TABLE test_users;`;

      const { up } = parseMigration(migration);
      applyMigration(db, '001_create_users.sql', up);

      expect(tableExists(db, 'test_users')).toBe(true);
      expect(getAppliedMigrations(db)).toEqual(['001_create_users.sql']);
    });

    it('should apply multiple migrations in order', () => {
      const migration1 = `-- UP
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
-- DOWN
DROP TABLE users;`;

      const migration2 = `-- UP
CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), title TEXT);
-- DOWN
DROP TABLE posts;`;

      applyMigration(db, '001_users.sql', parseMigration(migration1).up);
      applyMigration(db, '002_posts.sql', parseMigration(migration2).up);

      expect(tableExists(db, 'users')).toBe(true);
      expect(tableExists(db, 'posts')).toBe(true);
      expect(getAppliedMigrations(db)).toEqual(['001_users.sql', '002_posts.sql']);
    });

    it('should record migration timestamp', () => {
      applyMigration(db, '001_test.sql', 'CREATE TABLE test (id INTEGER);');

      const record = db
        .prepare('SELECT * FROM _migrations WHERE name = ?')
        .get('001_test.sql') as MigrationRecord;

      expect(record.name).toBe('001_test.sql');
      expect(record.applied_at).toBeDefined();
    });

    it('should prevent duplicate migration application', () => {
      applyMigration(db, '001_test.sql', 'CREATE TABLE test1 (id INTEGER);');

      expect(() => {
        applyMigration(db, '001_test.sql', 'CREATE TABLE test2 (id INTEGER);');
      }).toThrow();
    });

    it('should rollback transaction on SQL error', () => {
      const invalidMigration = 'INVALID SQL STATEMENT;';

      expect(() => {
        applyMigration(db, '001_invalid.sql', invalidMigration);
      }).toThrow();

      // Migration should not be recorded
      expect(getAppliedMigrations(db)).toEqual([]);
    });
  });

  describe('rolling back migrations', () => {
    it('should rollback a single migration', () => {
      const migration = `-- UP
CREATE TABLE rollback_test (id INTEGER PRIMARY KEY);
-- DOWN
DROP TABLE rollback_test;`;

      const { up, down } = parseMigration(migration);

      // Apply
      applyMigration(db, '001_rollback_test.sql', up);
      expect(tableExists(db, 'rollback_test')).toBe(true);

      // Rollback
      rollbackMigration(db, '001_rollback_test.sql', down);
      expect(tableExists(db, 'rollback_test')).toBe(false);
      expect(getAppliedMigrations(db)).toEqual([]);
    });

    it('should rollback migrations in reverse order', () => {
      const migration1 = `-- UP
CREATE TABLE parent (id INTEGER PRIMARY KEY);
-- DOWN
DROP TABLE parent;`;

      const migration2 = `-- UP
CREATE TABLE child (id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES parent(id));
-- DOWN
DROP TABLE child;`;

      const m1 = parseMigration(migration1);
      const m2 = parseMigration(migration2);

      // Apply both
      applyMigration(db, '001_parent.sql', m1.up);
      applyMigration(db, '002_child.sql', m2.up);

      expect(getAllTables(db)).toContain('parent');
      expect(getAllTables(db)).toContain('child');

      // Rollback child first (reverse order)
      rollbackMigration(db, '002_child.sql', m2.down);
      expect(tableExists(db, 'child')).toBe(false);
      expect(tableExists(db, 'parent')).toBe(true);
      expect(getAppliedMigrations(db)).toEqual(['001_parent.sql']);

      // Rollback parent
      rollbackMigration(db, '001_parent.sql', m1.down);
      expect(tableExists(db, 'parent')).toBe(false);
      expect(getAppliedMigrations(db)).toEqual([]);
    });

    it('should handle rollback with foreign key constraints', () => {
      // This tests that we can properly drop tables with FK relationships
      const migration = `-- UP
CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  dept_id INTEGER,
  FOREIGN KEY (dept_id) REFERENCES departments(id)
);
-- DOWN
DROP TABLE employees;
DROP TABLE departments;`;

      const { up, down } = parseMigration(migration);

      applyMigration(db, '001_org.sql', up);
      expect(tableExists(db, 'departments')).toBe(true);
      expect(tableExists(db, 'employees')).toBe(true);

      rollbackMigration(db, '001_org.sql', down);
      expect(tableExists(db, 'departments')).toBe(false);
      expect(tableExists(db, 'employees')).toBe(false);
    });
  });

  describe('idempotency', () => {
    it('should handle IF NOT EXISTS for tables', () => {
      const migration = `-- UP
CREATE TABLE IF NOT EXISTS idempotent_test (id INTEGER PRIMARY KEY);
-- DOWN
DROP TABLE IF EXISTS idempotent_test;`;

      const { up } = parseMigration(migration);

      // Should not throw on double execution
      db.exec(up);
      db.exec(up);

      expect(tableExists(db, 'idempotent_test')).toBe(true);
    });

    it('should handle IF EXISTS for drops', () => {
      const { down } = parseMigration(`-- UP
-- nothing
-- DOWN
DROP TABLE IF EXISTS nonexistent_table;`);

      // Should not throw
      expect(() => db.exec(down)).not.toThrow();
    });
  });

  describe('real schema migration', () => {
    it('should apply the initial schema migration', () => {
      // This tests a realistic migration similar to 001_initial_schema.sql
      const schemaMigration = `-- UP
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  project_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  local_path TEXT NOT NULL,
  owner_user_id INTEGER NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'backlog',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_status ON tasks(status);

-- DOWN
DROP INDEX IF EXISTS idx_tasks_status;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;`;

      const { up, down } = parseMigration(schemaMigration);

      // Apply
      applyMigration(db, '001_initial_schema.sql', up);

      expect(tableExists(db, 'users')).toBe(true);
      expect(tableExists(db, 'projects')).toBe(true);
      expect(tableExists(db, 'tasks')).toBe(true);

      // Verify we can insert data with proper FK relationships
      db.prepare(
        "INSERT INTO users (email, display_name) VALUES ('test@test.com', 'Test User')"
      ).run();
      db.prepare(
        "INSERT INTO projects (project_id, name, local_path, owner_user_id) VALUES ('proj-1', 'Test', '/tmp', 1)"
      ).run();
      db.prepare("INSERT INTO tasks (project_id, title) VALUES (1, 'Task 1')").run();

      const task = db.prepare('SELECT * FROM tasks WHERE id = 1').get() as { status: string };
      expect(task.status).toBe('backlog');

      // Rollback
      rollbackMigration(db, '001_initial_schema.sql', down);

      expect(tableExists(db, 'users')).toBe(false);
      expect(tableExists(db, 'projects')).toBe(false);
      expect(tableExists(db, 'tasks')).toBe(false);
    });

    it('should enforce foreign key constraints', () => {
      const migration = `-- UP
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id));
-- DOWN
DROP TABLE posts;
DROP TABLE users;`;

      const { up } = parseMigration(migration);
      applyMigration(db, '001_fk.sql', up);

      // Insert valid data
      db.prepare("INSERT INTO users (name) VALUES ('Alice')").run();
      db.prepare('INSERT INTO posts (user_id) VALUES (1)').run();

      // Attempt to insert with invalid FK should fail
      expect(() => {
        db.prepare('INSERT INTO posts (user_id) VALUES (999)').run();
      }).toThrow(/FOREIGN KEY constraint failed/);
    });
  });

  describe('edge cases', () => {
    it('should handle empty migration content', () => {
      const result = parseMigration('');
      expect(result.up).toBe('');
      expect(result.down).toBe('');
    });

    it('should handle migration with comments', () => {
      const migration = `-- UP
-- This creates the main table
CREATE TABLE commented (id INTEGER);
-- Another comment
-- DOWN
-- This drops the table
DROP TABLE commented;`;

      const { up, down } = parseMigration(migration);

      expect(up).toContain('CREATE TABLE commented');
      expect(down).toContain('DROP TABLE commented');
    });

    it('should handle migration with extra whitespace', () => {
      const migration = `

-- UP


CREATE TABLE whitespace_test (id INTEGER);


-- DOWN


DROP TABLE whitespace_test;

`;

      const { up, down } = parseMigration(migration);

      expect(up).toContain('CREATE TABLE whitespace_test');
      expect(down).toContain('DROP TABLE whitespace_test');
    });
  });
});
