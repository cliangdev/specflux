-- UP
-- ============================================================================
-- Add unique constraint on project name per user
-- Prevents duplicate project names for the same user
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_name_owner
ON projects(name, owner_user_id);

-- DOWN
DROP INDEX IF EXISTS idx_projects_name_owner;
