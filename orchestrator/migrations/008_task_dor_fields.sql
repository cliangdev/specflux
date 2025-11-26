-- UP
-- Add Definition of Ready (DoR) fields and Owner+Executor model to tasks table

-- Acceptance criteria: testable success conditions (markdown checklist)
ALTER TABLE tasks ADD COLUMN acceptance_criteria TEXT;

-- Scope boundaries: what's in/out of scope for this task
ALTER TABLE tasks ADD COLUMN scope_in TEXT;
ALTER TABLE tasks ADD COLUMN scope_out TEXT;

-- Owner: human accountable for quality (reviews and approves)
ALTER TABLE tasks ADD COLUMN owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Executor type: whether the executor is a human developer or AI agent
-- (agent_name already exists for specifying which agent type)
ALTER TABLE tasks ADD COLUMN executor_type TEXT DEFAULT 'agent' CHECK(executor_type IN ('human', 'agent'));

-- Index for owner queries
CREATE INDEX idx_tasks_owner ON tasks(owner_user_id);

-- DOWN
DROP INDEX IF EXISTS idx_tasks_owner;

-- Note: SQLite does not support DROP COLUMN directly.
-- To fully rollback, you would need to:
-- 1. Create a new table without the new columns
-- 2. Copy data from old table
-- 3. Drop old table
-- 4. Rename new table
-- For development purposes, the database can be reset instead.
