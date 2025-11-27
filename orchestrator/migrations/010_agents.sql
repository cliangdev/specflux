-- UP
-- Agents table for Claude Code agent definitions per project
CREATE TABLE agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '🤖',
  system_prompt TEXT,
  tools TEXT,  -- JSON array of tool names/configs
  config_file_path TEXT,  -- Path to .claude/agents/*.md file
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, name)
);

CREATE INDEX idx_agents_project_id ON agents(project_id);

-- Add default_agent_id to projects table
ALTER TABLE projects ADD COLUMN default_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL;

-- DOWN
ALTER TABLE projects DROP COLUMN default_agent_id;
DROP INDEX IF EXISTS idx_agents_project_id;
DROP TABLE agents;
