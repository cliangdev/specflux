-- UP
CREATE TABLE agent_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  pid INTEGER,
  worktree_path TEXT,
  status TEXT NOT NULL DEFAULT 'starting' CHECK (status IN ('starting', 'running', 'stopping', 'stopped', 'failed', 'completed')),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  exit_code INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_sessions_task_id ON agent_sessions(task_id);
CREATE INDEX idx_agent_sessions_status ON agent_sessions(status);

CREATE TABLE task_file_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES agent_sessions(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'modified', 'deleted')),
  diff_summary TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_file_changes_task_id ON task_file_changes(task_id);
CREATE INDEX idx_task_file_changes_session_id ON task_file_changes(session_id);

-- DOWN
DROP INDEX IF EXISTS idx_task_file_changes_session_id;
DROP INDEX IF EXISTS idx_task_file_changes_task_id;
DROP TABLE IF EXISTS task_file_changes;

DROP INDEX IF EXISTS idx_agent_sessions_status;
DROP INDEX IF EXISTS idx_agent_sessions_task_id;
DROP TABLE IF EXISTS agent_sessions;
