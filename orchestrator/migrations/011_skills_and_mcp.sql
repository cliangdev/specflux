-- UP
-- Skills table for Claude Code skill definitions per project
CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  folder_path TEXT NOT NULL,  -- Path to .claude/skills/{name}/
  description TEXT,
  file_patterns TEXT,  -- JSON array of glob patterns for auto-invocation
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, name)
);

CREATE INDEX idx_skills_project_id ON skills(project_id);

-- MCP Servers table for Model Context Protocol server configurations
CREATE TABLE mcp_servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  command TEXT NOT NULL,  -- e.g., npx, node
  args TEXT NOT NULL,  -- JSON array of command arguments
  env_vars TEXT,  -- JSON object of environment variables
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, name)
);

CREATE INDEX idx_mcp_servers_project_id ON mcp_servers(project_id);

-- DOWN
DROP INDEX IF EXISTS idx_mcp_servers_project_id;
DROP TABLE mcp_servers;
DROP INDEX IF EXISTS idx_skills_project_id;
DROP TABLE skills;
