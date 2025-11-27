/**
 * Skill Service
 * Manages skill definitions (CRUD operations)
 * Skills are auto-invoked by Claude Code based on file patterns
 */

import { getDatabase } from '../db';
import { NotFoundError, ValidationError } from '../types';
import { getProjectById } from './project.service';
import path from 'path';
import fs from 'fs';

export interface Skill {
  id: number;
  project_id: number;
  name: string;
  folder_path: string;
  description: string | null;
  file_patterns: string | null; // JSON array
  created_at: string;
}

export interface CreateSkillInput {
  name: string;
  folder_path: string;
  description?: string | null;
  file_patterns?: string[] | null;
}

export interface UpdateSkillInput {
  name?: string;
  folder_path?: string;
  description?: string | null;
  file_patterns?: string[] | null;
}

/**
 * List all skills for a project
 */
export function listSkills(projectId: number): Skill[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM skills
    WHERE project_id = ?
    ORDER BY name ASC
  `);
  return stmt.all(projectId) as Skill[];
}

/**
 * Get skill by ID
 */
export function getSkillById(skillId: number): Skill | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM skills WHERE id = ?');
  return (stmt.get(skillId) as Skill) || null;
}

/**
 * Get skill by name within a project
 */
export function getSkillByName(projectId: number, name: string): Skill | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM skills WHERE project_id = ? AND name = ?');
  return (stmt.get(projectId, name) as Skill) || null;
}

/**
 * Create a new skill for a project
 */
export function createSkill(projectId: number, input: CreateSkillInput): Skill {
  const db = getDatabase();

  // Check if name already exists
  const existing = getSkillByName(projectId, input.name);
  if (existing) {
    throw new ValidationError(`Skill with name "${input.name}" already exists in this project`);
  }

  const filePatternsJson = input.file_patterns ? JSON.stringify(input.file_patterns) : null;

  const stmt = db.prepare(`
    INSERT INTO skills (project_id, name, folder_path, description, file_patterns)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    projectId,
    input.name,
    input.folder_path,
    input.description ?? null,
    filePatternsJson
  );

  return getSkillById(result.lastInsertRowid as number)!;
}

/**
 * Update an existing skill
 */
export function updateSkill(skillId: number, input: UpdateSkillInput): Skill {
  const db = getDatabase();

  const existing = getSkillById(skillId);
  if (!existing) {
    throw new NotFoundError('Skill', skillId);
  }

  // If name is changing, check for conflicts
  if (input.name && input.name !== existing.name) {
    const nameConflict = getSkillByName(existing.project_id, input.name);
    if (nameConflict) {
      throw new ValidationError(`Skill with name "${input.name}" already exists in this project`);
    }
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.folder_path !== undefined) {
    updates.push('folder_path = ?');
    values.push(input.folder_path);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.file_patterns !== undefined) {
    updates.push('file_patterns = ?');
    values.push(input.file_patterns ? JSON.stringify(input.file_patterns) : null);
  }

  if (updates.length === 0) {
    return existing;
  }

  values.push(skillId);

  const stmt = db.prepare(`
    UPDATE skills SET ${updates.join(', ')} WHERE id = ?
  `);
  stmt.run(...values);

  return getSkillById(skillId)!;
}

/**
 * Delete a skill
 */
export function deleteSkill(skillId: number): void {
  const db = getDatabase();

  const existing = getSkillById(skillId);
  if (!existing) {
    throw new NotFoundError('Skill', skillId);
  }

  db.prepare('DELETE FROM skills WHERE id = ?').run(skillId);
}

/**
 * Sync skills from .claude/skills/ directory
 * Scans for skill folders and creates/updates skill entries
 */
export function syncSkillsFromFilesystem(projectId: number): {
  created: number;
  updated: number;
  deleted: number;
} {
  const project = getProjectById(projectId);
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  const skillsDir = path.join(project.local_path, '.claude', 'skills');

  if (!fs.existsSync(skillsDir)) {
    return { created: 0, updated: 0, deleted: 0 };
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const foundSkillNames = new Set<string>();

  let created = 0;
  let updated = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillName = entry.name;
    const skillFolderPath = `.claude/skills/${skillName}`;
    const skillMdPath = path.join(skillsDir, skillName, 'SKILL.md');

    // Read SKILL.md if exists for description
    let description: string | null = null;
    if (fs.existsSync(skillMdPath)) {
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      // Extract first line as description (or first paragraph)
      const firstLine = content.split('\n').find((line) => line.trim() && !line.startsWith('#'));
      description = firstLine?.trim() ?? null;
    }

    foundSkillNames.add(skillName);

    const existingSkill = getSkillByName(projectId, skillName);
    if (existingSkill) {
      // Update if folder path or description changed
      if (
        existingSkill.folder_path !== skillFolderPath ||
        existingSkill.description !== description
      ) {
        updateSkill(existingSkill.id, { folder_path: skillFolderPath, description });
        updated++;
      }
    } else {
      // Create new skill
      createSkill(projectId, {
        name: skillName,
        folder_path: skillFolderPath,
        description,
      });
      created++;
    }
  }

  // Remove skills that no longer exist on filesystem
  const existingSkills = listSkills(projectId);
  let deleted = 0;
  for (const skill of existingSkills) {
    if (!foundSkillNames.has(skill.name)) {
      deleteSkill(skill.id);
      deleted++;
    }
  }

  return { created, updated, deleted };
}
