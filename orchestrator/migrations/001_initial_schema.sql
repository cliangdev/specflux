-- UP
-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

-- Users (proper normalization from day 1)
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (for future web version)
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  device_name TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- PROJECTS & TEAM MEMBERSHIP
-- ============================================================================

-- Projects
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  project_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  local_path TEXT NOT NULL,
  git_remote TEXT,
  workflow_template TEXT DEFAULT 'startup-fast',
  owner_user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

-- Project Members (scales from 1 to N users per project)
CREATE TABLE project_members (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'developer',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);

-- Project Configuration
CREATE TABLE project_config (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL UNIQUE,
  workflow_template TEXT NOT NULL,
  workflow_config TEXT,
  approval_config TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ============================================================================
-- REPOSITORIES
-- ============================================================================

CREATE TABLE repositories (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  git_url TEXT,
  default_agent TEXT,
  status TEXT DEFAULT 'ready',
  last_sync_at TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ============================================================================
-- EPICS
-- ============================================================================

CREATE TABLE epics (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  prd_file_path TEXT,
  epic_file_path TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  created_by_user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- ============================================================================
-- TASKS
-- ============================================================================

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  epic_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog',
  requires_approval INTEGER DEFAULT 1,
  repo_name TEXT,
  agent_name TEXT,
  agent_status TEXT DEFAULT 'idle',
  progress_percentage INTEGER DEFAULT 0,
  estimated_duration INTEGER,
  actual_duration INTEGER,
  github_issue_number INTEGER,
  github_branch_name TEXT,
  github_pr_number INTEGER,
  file_path TEXT,
  created_by_user_id INTEGER NOT NULL,
  assigned_to_user_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (epic_id) REFERENCES epics(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_user_id);

-- ============================================================================
-- TASK DEPENDENCIES
-- ============================================================================

CREATE TABLE task_dependencies (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  depends_on_task_id INTEGER NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE(task_id, depends_on_task_id)
);

-- ============================================================================
-- APPROVALS
-- ============================================================================

CREATE TABLE approvals (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  reviewer_user_id INTEGER NOT NULL,
  decision TEXT NOT NULL,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_user_id) REFERENCES users(id)
);

-- ============================================================================
-- CHAIN OUTPUTS
-- ============================================================================

CREATE TABLE chain_outputs (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================================
-- WORKTREES
-- ============================================================================

CREATE TABLE worktrees (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  path TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================================
-- ACTIVE AGENTS
-- ============================================================================

CREATE TABLE active_agents (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  pid INTEGER NOT NULL,
  working_dir TEXT NOT NULL,
  is_worktree INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  task_id INTEGER,
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- DOWN
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS active_agents;
DROP TABLE IF EXISTS worktrees;
DROP TABLE IF EXISTS chain_outputs;
DROP TABLE IF EXISTS approvals;
DROP TABLE IF EXISTS task_dependencies;
DROP INDEX IF EXISTS idx_tasks_assigned_to;
DROP INDEX IF EXISTS idx_tasks_project_id;
DROP INDEX IF EXISTS idx_tasks_status;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS epics;
DROP TABLE IF EXISTS repositories;
DROP TABLE IF EXISTS project_config;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
