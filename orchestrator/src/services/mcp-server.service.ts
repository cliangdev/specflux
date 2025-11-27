/**
 * MCP Server Service
 * Manages MCP (Model Context Protocol) server configurations
 * MCP servers extend Claude Code capabilities with external tools
 */

import { getDatabase } from '../db';
import { NotFoundError, ValidationError } from '../types';

export interface McpServer {
  id: number;
  project_id: number;
  name: string;
  command: string;
  args: string; // JSON array
  env_vars: string | null; // JSON object
  is_active: number; // SQLite boolean (0 or 1)
  created_at: string;
}

export interface CreateMcpServerInput {
  name: string;
  command: string;
  args: string[];
  env_vars?: Record<string, string> | null;
  is_active?: boolean;
}

export interface UpdateMcpServerInput {
  name?: string;
  command?: string;
  args?: string[];
  env_vars?: Record<string, string> | null;
  is_active?: boolean;
}

/**
 * List all MCP servers for a project
 */
export function listMcpServers(projectId: number): McpServer[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM mcp_servers
    WHERE project_id = ?
    ORDER BY name ASC
  `);
  return stmt.all(projectId) as McpServer[];
}

/**
 * Get MCP server by ID
 */
export function getMcpServerById(serverId: number): McpServer | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM mcp_servers WHERE id = ?');
  return (stmt.get(serverId) as McpServer) || null;
}

/**
 * Get MCP server by name within a project
 */
export function getMcpServerByName(projectId: number, name: string): McpServer | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM mcp_servers WHERE project_id = ? AND name = ?');
  return (stmt.get(projectId, name) as McpServer) || null;
}

/**
 * Create a new MCP server for a project
 */
export function createMcpServer(projectId: number, input: CreateMcpServerInput): McpServer {
  const db = getDatabase();

  // Check if name already exists
  const existing = getMcpServerByName(projectId, input.name);
  if (existing) {
    throw new ValidationError(
      `MCP server with name "${input.name}" already exists in this project`
    );
  }

  const argsJson = JSON.stringify(input.args);
  const envVarsJson = input.env_vars ? JSON.stringify(input.env_vars) : null;

  const stmt = db.prepare(`
    INSERT INTO mcp_servers (project_id, name, command, args, env_vars, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    projectId,
    input.name,
    input.command,
    argsJson,
    envVarsJson,
    input.is_active !== false ? 1 : 0
  );

  return getMcpServerById(result.lastInsertRowid as number)!;
}

/**
 * Update an existing MCP server
 */
export function updateMcpServer(serverId: number, input: UpdateMcpServerInput): McpServer {
  const db = getDatabase();

  const existing = getMcpServerById(serverId);
  if (!existing) {
    throw new NotFoundError('MCP Server', serverId);
  }

  // If name is changing, check for conflicts
  if (input.name && input.name !== existing.name) {
    const nameConflict = getMcpServerByName(existing.project_id, input.name);
    if (nameConflict) {
      throw new ValidationError(
        `MCP server with name "${input.name}" already exists in this project`
      );
    }
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.command !== undefined) {
    updates.push('command = ?');
    values.push(input.command);
  }
  if (input.args !== undefined) {
    updates.push('args = ?');
    values.push(JSON.stringify(input.args));
  }
  if (input.env_vars !== undefined) {
    updates.push('env_vars = ?');
    values.push(input.env_vars ? JSON.stringify(input.env_vars) : null);
  }
  if (input.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(input.is_active ? 1 : 0);
  }

  if (updates.length === 0) {
    return existing;
  }

  values.push(serverId);

  const stmt = db.prepare(`
    UPDATE mcp_servers SET ${updates.join(', ')} WHERE id = ?
  `);
  stmt.run(...values);

  return getMcpServerById(serverId)!;
}

/**
 * Delete an MCP server
 */
export function deleteMcpServer(serverId: number): void {
  const db = getDatabase();

  const existing = getMcpServerById(serverId);
  if (!existing) {
    throw new NotFoundError('MCP Server', serverId);
  }

  db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(serverId);
}

/**
 * Toggle MCP server active status
 */
export function toggleMcpServer(serverId: number): McpServer {
  const db = getDatabase();

  const existing = getMcpServerById(serverId);
  if (!existing) {
    throw new NotFoundError('MCP Server', serverId);
  }

  const newStatus = existing.is_active ? 0 : 1;
  db.prepare('UPDATE mcp_servers SET is_active = ? WHERE id = ?').run(newStatus, serverId);

  return getMcpServerById(serverId)!;
}

/**
 * Get all active MCP servers for a project
 */
export function getActiveMcpServers(projectId: number): McpServer[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM mcp_servers
    WHERE project_id = ? AND is_active = 1
    ORDER BY name ASC
  `);
  return stmt.all(projectId) as McpServer[];
}
