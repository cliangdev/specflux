/**
 * Agent Configuration Service
 * Manages agent definitions (CRUD operations for agent configurations)
 * Different from agent.service.ts which manages running Claude Code sessions
 */

import { getDatabase } from '../db';
import { NotFoundError, ValidationError } from '../types';
import { getProjectById } from './project.service';
import path from 'path';
import fs from 'fs';

export interface Agent {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  emoji: string;
  system_prompt: string | null;
  tools: string | null; // JSON array
  config_file_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentInput {
  name: string;
  description?: string | null;
  emoji?: string;
  system_prompt?: string | null;
  tools?: string[] | null;
  config_file_path?: string | null;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string | null;
  emoji?: string;
  system_prompt?: string | null;
  tools?: string[] | null;
  config_file_path?: string | null;
}

/**
 * List all agents for a project
 */
export function listAgents(projectId: number): Agent[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM agents
    WHERE project_id = ?
    ORDER BY name ASC
  `);
  return stmt.all(projectId) as Agent[];
}

/**
 * Get agent by ID
 */
export function getAgentById(agentId: number): Agent | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM agents WHERE id = ?');
  return (stmt.get(agentId) as Agent) || null;
}

/**
 * Get agent by name within a project
 */
export function getAgentByName(projectId: number, name: string): Agent | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM agents WHERE project_id = ? AND name = ?');
  return (stmt.get(projectId, name) as Agent) || null;
}

/**
 * Create a new agent for a project
 */
export function createAgent(projectId: number, input: CreateAgentInput): Agent {
  const db = getDatabase();

  // Check if name already exists
  const existing = getAgentByName(projectId, input.name);
  if (existing) {
    throw new ValidationError(`Agent with name "${input.name}" already exists in this project`);
  }

  const toolsJson = input.tools ? JSON.stringify(input.tools) : null;

  const stmt = db.prepare(`
    INSERT INTO agents (project_id, name, description, emoji, system_prompt, tools, config_file_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    projectId,
    input.name,
    input.description ?? null,
    input.emoji ?? '🤖',
    input.system_prompt ?? null,
    toolsJson,
    input.config_file_path ?? null
  );

  return getAgentById(result.lastInsertRowid as number)!;
}

/**
 * Update an existing agent
 */
export function updateAgent(agentId: number, input: UpdateAgentInput): Agent {
  const db = getDatabase();

  const existing = getAgentById(agentId);
  if (!existing) {
    throw new NotFoundError('Agent', agentId);
  }

  // If name is changing, check for conflicts
  if (input.name && input.name !== existing.name) {
    const nameConflict = getAgentByName(existing.project_id, input.name);
    if (nameConflict) {
      throw new ValidationError(`Agent with name "${input.name}" already exists in this project`);
    }
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.emoji !== undefined) {
    updates.push('emoji = ?');
    values.push(input.emoji);
  }
  if (input.system_prompt !== undefined) {
    updates.push('system_prompt = ?');
    values.push(input.system_prompt);
  }
  if (input.tools !== undefined) {
    updates.push('tools = ?');
    values.push(input.tools ? JSON.stringify(input.tools) : null);
  }
  if (input.config_file_path !== undefined) {
    updates.push('config_file_path = ?');
    values.push(input.config_file_path);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(agentId);

  const stmt = db.prepare(`
    UPDATE agents SET ${updates.join(', ')} WHERE id = ?
  `);
  stmt.run(...values);

  return getAgentById(agentId)!;
}

/**
 * Delete an agent
 */
export function deleteAgent(agentId: number): void {
  const db = getDatabase();

  const existing = getAgentById(agentId);
  if (!existing) {
    throw new NotFoundError('Agent', agentId);
  }

  // Clear default_agent_id from project if this was the default
  db.prepare(
    `
    UPDATE projects SET default_agent_id = NULL WHERE default_agent_id = ?
  `
  ).run(agentId);

  // Clear assigned_agent_id from tasks if this agent was assigned
  db.prepare(
    `
    UPDATE tasks SET assigned_agent_id = NULL WHERE assigned_agent_id = ?
  `
  ).run(agentId);

  db.prepare('DELETE FROM agents WHERE id = ?').run(agentId);
}

/**
 * Set project default agent
 */
export function setProjectDefaultAgent(projectId: number, agentId: number | null): void {
  const db = getDatabase();

  if (agentId !== null) {
    const agent = getAgentById(agentId);
    if (!agent) {
      throw new NotFoundError('Agent', agentId);
    }
    if (agent.project_id !== projectId) {
      throw new ValidationError('Agent does not belong to this project');
    }
  }

  db.prepare('UPDATE projects SET default_agent_id = ? WHERE id = ?').run(agentId, projectId);
}

/**
 * Get the default agent for a project
 */
export function getProjectDefaultAgent(projectId: number): Agent | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT a.* FROM agents a
    JOIN projects p ON p.default_agent_id = a.id
    WHERE p.id = ?
  `);
  return (stmt.get(projectId) as Agent) || null;
}

/**
 * Count tasks assigned to an agent
 */
export function countTasksWithAgent(agentId: number): number {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE assigned_agent_id = ?');
  const result = stmt.get(agentId) as { count: number };
  return result.count;
}

/**
 * Parse YAML frontmatter from markdown file
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterStr = match[1] ?? '';
  const body = match[2] ?? '';

  // Simple YAML parsing for key: value pairs
  const frontmatter: Record<string, string> = {};
  for (const line of frontmatterStr.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * Sync agents from .claude/agents/ directory
 * Scans for agent markdown files and creates/updates agent entries
 */
export function syncAgentsFromFilesystem(projectId: number): {
  created: number;
  updated: number;
  deleted: number;
} {
  const project = getProjectById(projectId);
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  const agentsDir = path.join(project.local_path, '.claude', 'agents');

  if (!fs.existsSync(agentsDir)) {
    return { created: 0, updated: 0, deleted: 0 };
  }

  const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  const foundAgentNames = new Set<string>();

  let created = 0;
  let updated = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const agentFilePath = path.join(agentsDir, entry.name);
    const configPath = `.claude/agents/${entry.name}`;
    const content = fs.readFileSync(agentFilePath, 'utf-8');

    const { frontmatter, body } = parseFrontmatter(content);

    // Use frontmatter name or derive from filename
    const agentName = frontmatter['name'] ?? entry.name.replace(/\.md$/, '');
    const description = frontmatter['description'] ?? null;
    const systemPrompt = body.trim() || null;

    foundAgentNames.add(agentName);

    const existingAgent = getAgentByName(projectId, agentName);
    if (existingAgent) {
      // Update if content changed
      if (
        existingAgent.config_file_path !== configPath ||
        existingAgent.description !== description ||
        existingAgent.system_prompt !== systemPrompt
      ) {
        updateAgent(existingAgent.id, {
          config_file_path: configPath,
          description,
          system_prompt: systemPrompt,
        });
        updated++;
      }
    } else {
      // Create new agent
      createAgent(projectId, {
        name: agentName,
        description,
        system_prompt: systemPrompt,
        config_file_path: configPath,
      });
      created++;
    }
  }

  // Remove agents that no longer exist on filesystem (only those that have config_file_path)
  const existingAgents = listAgents(projectId);
  let deleted = 0;
  for (const agent of existingAgents) {
    // Only delete agents that were synced from filesystem (have config_file_path)
    if (agent.config_file_path && !foundAgentNames.has(agent.name)) {
      deleteAgent(agent.id);
      deleted++;
    }
  }

  return { created, updated, deleted };
}
