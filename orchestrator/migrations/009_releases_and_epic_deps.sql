-- UP
-- ============================================================================
-- RELEASES TABLE
-- ============================================================================

CREATE TABLE releases (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'planned',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_releases_project_id ON releases(project_id);
CREATE INDEX idx_releases_status ON releases(status);

-- ============================================================================
-- EPIC CHANGES FOR ROADMAP SUPPORT
-- ============================================================================

-- Add release_id to link epics to releases
ALTER TABLE epics ADD COLUMN release_id INTEGER REFERENCES releases(id) ON DELETE SET NULL;

-- Add depends_on for epic-level dependencies (JSON array of epic IDs)
ALTER TABLE epics ADD COLUMN depends_on TEXT;

-- Add target_date for epic-specific deadlines
ALTER TABLE epics ADD COLUMN target_date DATE;

CREATE INDEX idx_epics_release_id ON epics(release_id);

-- DOWN
DROP INDEX IF EXISTS idx_epics_release_id;

-- SQLite doesn't support DROP COLUMN directly, but we can leave the columns
-- as they won't break existing code. For a full rollback, recreate the table.

DROP INDEX IF EXISTS idx_releases_status;
DROP INDEX IF EXISTS idx_releases_project_id;
DROP TABLE IF EXISTS releases;
