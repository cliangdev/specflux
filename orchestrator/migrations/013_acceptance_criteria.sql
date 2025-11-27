-- UP
-- ============================================================================
-- ACCEPTANCE CRITERIA TABLE
-- ============================================================================
-- Shared table for acceptance criteria on both epics and tasks.
-- Uses polymorphic pattern: entity_type + entity_id to reference parent.

CREATE TABLE acceptance_criteria (
  id INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('epic', 'task')),
  entity_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  checked INTEGER DEFAULT 0,
  checked_at TEXT,
  position INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by parent entity
CREATE INDEX idx_ac_entity ON acceptance_criteria(entity_type, entity_id);

-- Index for ordering within an entity
CREATE INDEX idx_ac_position ON acceptance_criteria(entity_type, entity_id, position);

-- DOWN
DROP INDEX IF EXISTS idx_ac_position;
DROP INDEX IF EXISTS idx_ac_entity;
DROP TABLE IF EXISTS acceptance_criteria;
