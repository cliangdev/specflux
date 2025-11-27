-- UP
-- Add agent assignment to tasks for runtime agent resolution
ALTER TABLE tasks ADD COLUMN assigned_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_assigned_agent_id ON tasks(assigned_agent_id);

-- DOWN
DROP INDEX IF EXISTS idx_tasks_assigned_agent_id;
ALTER TABLE tasks DROP COLUMN assigned_agent_id;
