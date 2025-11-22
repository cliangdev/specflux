import { getDatabase } from '../db';
import { NotFoundError } from '../types';

export interface Repository {
  id: number;
  project_id: number;
  name: string;
  path: string;
  git_url: string | null;
  default_agent: string | null;
  status: string;
  last_sync_at: string | null;
}

export interface CreateRepositoryInput {
  name: string;
  path: string;
  git_url?: string;
  default_agent?: string;
}

export interface UpdateRepositoryInput {
  name?: string;
  path?: string;
  git_url?: string | null;
  default_agent?: string | null;
  status?: string;
}

/**
 * List repositories for a project
 */
export function listRepositories(projectId: number): Repository[] {
  const db = getDatabase();
  return db
    .prepare(
      `
      SELECT * FROM repositories
      WHERE project_id = ?
      ORDER BY name ASC
    `
    )
    .all(projectId) as Repository[];
}

/**
 * Get repository by ID
 */
export function getRepositoryById(id: number): Repository | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM repositories WHERE id = ?').get(id) as
    | Repository
    | undefined;
  return row ?? null;
}

/**
 * Create a new repository
 */
export function createRepository(projectId: number, input: CreateRepositoryInput): Repository {
  const db = getDatabase();

  const result = db
    .prepare(
      `
      INSERT INTO repositories (project_id, name, path, git_url, default_agent, status)
      VALUES (?, ?, ?, ?, ?, 'ready')
    `
    )
    .run(projectId, input.name, input.path, input.git_url ?? null, input.default_agent ?? null);

  return getRepositoryById(result.lastInsertRowid as number)!;
}

/**
 * Update repository
 */
export function updateRepository(id: number, input: UpdateRepositoryInput): Repository {
  const db = getDatabase();
  const repo = getRepositoryById(id);

  if (!repo) {
    throw new NotFoundError('Repository', id);
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }

  if (input.path !== undefined) {
    updates.push('path = ?');
    values.push(input.path);
  }

  if (input.git_url !== undefined) {
    updates.push('git_url = ?');
    values.push(input.git_url);
  }

  if (input.default_agent !== undefined) {
    updates.push('default_agent = ?');
    values.push(input.default_agent);
  }

  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }

  if (updates.length > 0) {
    db.prepare(`UPDATE repositories SET ${updates.join(', ')} WHERE id = ?`).run(...values, id);
  }

  return getRepositoryById(id)!;
}

/**
 * Delete repository
 */
export function deleteRepository(id: number): void {
  const db = getDatabase();
  const repo = getRepositoryById(id);

  if (!repo) {
    throw new NotFoundError('Repository', id);
  }

  db.prepare('DELETE FROM repositories WHERE id = ?').run(id);
}

/**
 * Sync repository with remote (stub - will be implemented with git integration)
 */
export function syncRepository(id: number): Repository {
  const db = getDatabase();
  const repo = getRepositoryById(id);

  if (!repo) {
    throw new NotFoundError('Repository', id);
  }

  // Update last sync timestamp
  db.prepare(
    'UPDATE repositories SET last_sync_at = CURRENT_TIMESTAMP, status = ? WHERE id = ?'
  ).run('ready', id);

  return getRepositoryById(id)!;
}
