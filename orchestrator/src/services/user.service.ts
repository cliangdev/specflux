import { execSync } from 'child_process';
import { getDatabase } from '../db';

export interface User {
  id: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  display_name: string;
  avatar_url?: string;
}

export interface UpdateUserInput {
  display_name?: string;
  avatar_url?: string;
}

/**
 * Get git config value
 */
function getGitConfig(key: string): string | null {
  try {
    return execSync(`git config --global ${key}`, { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Get user info from git config
 */
export function getGitUserInfo(): { email: string; name: string } | null {
  const email = getGitConfig('user.email');
  const name = getGitConfig('user.name');

  if (!email) {
    return null;
  }

  return {
    email: email,
    name: name ?? email.split('@')[0] ?? email,
  };
}

/**
 * Find user by ID
 */
export function getUserById(id: number): User | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  return row ?? null;
}

/**
 * Find user by email
 */
export function getUserByEmail(email: string): User | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  return row ?? null;
}

/**
 * Create a new user
 */
export function createUser(input: CreateUserInput): User {
  const db = getDatabase();

  const result = db
    .prepare(
      `
    INSERT INTO users (email, display_name, avatar_url)
    VALUES (?, ?, ?)
  `
    )
    .run(input.email, input.display_name, input.avatar_url ?? null);

  return getUserById(result.lastInsertRowid as number)!;
}

/**
 * Update user
 */
export function updateUser(id: number, input: UpdateUserInput): User | null {
  const db = getDatabase();
  const user = getUserById(id);

  if (!user) {
    return null;
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (input.display_name !== undefined) {
    updates.push('display_name = ?');
    values.push(input.display_name);
  }

  if (input.avatar_url !== undefined) {
    updates.push('avatar_url = ?');
    values.push(input.avatar_url);
  }

  if (updates.length === 0) {
    return user;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id.toString());

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values.slice(0, -1), id);

  return getUserById(id);
}

/**
 * Initialize or get the current user from git config
 * This is the main entry point for desktop app user setup
 */
export function initializeCurrentUser(): User {
  const gitInfo = getGitUserInfo();

  if (!gitInfo) {
    throw new Error(
      'Could not determine user from git config. Please run: git config --global user.email "your@email.com"'
    );
  }

  // Check if user already exists
  const existingUser = getUserByEmail(gitInfo.email);
  if (existingUser) {
    return existingUser;
  }

  // Create new user
  return createUser({
    email: gitInfo.email,
    display_name: gitInfo.name,
  });
}

/**
 * Get all users (for admin/team views)
 */
export function getAllUsers(): User[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM users ORDER BY display_name').all() as User[];
}
