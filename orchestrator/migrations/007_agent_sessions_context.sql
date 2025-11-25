-- UP
-- Rename task_id to context_id and add context_type column
-- This allows agent_sessions to track agents for tasks, epics, and projects

-- SQLite 3.25+ supports RENAME COLUMN
ALTER TABLE agent_sessions RENAME COLUMN task_id TO context_id;

-- Add context_type column with default 'task' for backwards compatibility
ALTER TABLE agent_sessions ADD COLUMN context_type TEXT NOT NULL DEFAULT 'task' CHECK (context_type IN ('task', 'epic', 'project'));

-- Drop old index and create new one with updated column name
DROP INDEX IF EXISTS idx_agent_sessions_task_id;
CREATE INDEX idx_agent_sessions_context ON agent_sessions(context_type, context_id);

-- DOWN
-- Revert changes
DROP INDEX IF EXISTS idx_agent_sessions_context;
CREATE INDEX idx_agent_sessions_task_id ON agent_sessions(context_id);

-- Remove context_type column (SQLite doesn't support DROP COLUMN in older versions)
-- We'll just rename back and leave the column
ALTER TABLE agent_sessions RENAME COLUMN context_id TO task_id;

-- Note: context_type column will remain but be ignored
