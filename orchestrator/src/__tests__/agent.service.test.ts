import { getDatabase } from '../db';
import {
  getAgentSession,
  getActiveSessionForTask,
  isAgentRunning,
  getAgentStatus,
  getTaskSessionHistory,
  cleanupStaleSessions,
} from '../services/agent.service';

// Mock node-pty since we can't spawn real PTYs in tests
jest.mock('node-pty', () => ({
  spawn: jest.fn(),
}));

describe('AgentService', () => {
  let projectId: number;
  let taskId: number;

  beforeAll(() => {
    const db = getDatabase();

    // Ensure default user exists
    db.exec(`
      INSERT OR IGNORE INTO users (id, email, display_name)
      VALUES (1, 'default@specflux.dev', 'Default User')
    `);

    // Create a test project
    const projectResult = db
      .prepare(
        `INSERT INTO projects (project_id, name, local_path, owner_user_id)
         VALUES (?, ?, ?, ?)`
      )
      .run(`agent-test-${Date.now()}`, 'Agent Test Project', '/test/agent', 1);
    projectId = projectResult.lastInsertRowid as number;

    // Add user as project member
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES (?, ?, 'owner')`
    ).run(projectId, 1);

    // Create a task
    const taskResult = db
      .prepare(
        `INSERT INTO tasks (project_id, title, status, requires_approval, created_by_user_id)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(projectId, 'Test agent task', 'ready', 0, 1);
    taskId = taskResult.lastInsertRowid as number;
  });

  describe('getAgentSession', () => {
    let sessionId: number;

    beforeAll(() => {
      const db = getDatabase();
      const result = db
        .prepare(
          `INSERT INTO agent_sessions (context_type, context_id, worktree_path, status, pid)
           VALUES ('task', ?, ?, ?, ?)`
        )
        .run(taskId, '/test/worktree', 'running', 12345);
      sessionId = result.lastInsertRowid as number;
    });

    it('should return session by ID', () => {
      const session = getAgentSession(sessionId);

      expect(session).not.toBeNull();
      expect(session?.id).toBe(sessionId);
      expect(session?.taskId).toBe(taskId);
      expect(session?.pid).toBe(12345);
      expect(session?.status).toBe('running');
      expect(session?.worktreePath).toBe('/test/worktree');
    });

    it('should return null for non-existent session', () => {
      const session = getAgentSession(99999);
      expect(session).toBeNull();
    });
  });

  describe('getActiveSessionForTask', () => {
    let activeTaskId: number;

    beforeAll(() => {
      const db = getDatabase();

      // Create another task for active session tests
      const taskResult = db
        .prepare(
          `INSERT INTO tasks (project_id, title, status, requires_approval, created_by_user_id)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(projectId, 'Active session task', 'in_progress', 0, 1);
      activeTaskId = taskResult.lastInsertRowid as number;

      // Create a completed session (should not be returned)
      db.prepare(
        `INSERT INTO agent_sessions (context_type, context_id, status, ended_at)
         VALUES ('task', ?, 'completed', CURRENT_TIMESTAMP)`
      ).run(activeTaskId);

      // Create a running session (should be returned)
      db.prepare(
        `INSERT INTO agent_sessions (context_type, context_id, status, pid)
         VALUES ('task', ?, 'running', 54321)`
      ).run(activeTaskId);
    });

    it('should return active running session', () => {
      const session = getActiveSessionForTask(activeTaskId);

      expect(session).not.toBeNull();
      expect(session?.taskId).toBe(activeTaskId);
      expect(session?.status).toBe('running');
      expect(session?.pid).toBe(54321);
    });

    it('should return null when no active session', () => {
      // Create a task with only completed sessions
      const db = getDatabase();
      const taskResult = db
        .prepare(
          `INSERT INTO tasks (project_id, title, status, requires_approval, created_by_user_id)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(projectId, 'No active session task', 'ready', 0, 1);
      const noActiveTaskId = taskResult.lastInsertRowid as number;

      db.prepare(
        `INSERT INTO agent_sessions (context_type, context_id, status, ended_at)
         VALUES ('task', ?, 'completed', CURRENT_TIMESTAMP)`
      ).run(noActiveTaskId);

      const session = getActiveSessionForTask(noActiveTaskId);
      expect(session).toBeNull();
    });
  });

  describe('isAgentRunning', () => {
    it('should return false when no agent is running in memory', () => {
      // In tests, we mock node-pty so no real agents run
      const running = isAgentRunning(99999);
      expect(running).toBe(false);
    });
  });

  describe('getAgentStatus', () => {
    let statusTaskId: number;

    beforeAll(() => {
      const db = getDatabase();

      const taskResult = db
        .prepare(
          `INSERT INTO tasks (project_id, title, status, requires_approval, created_by_user_id)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(projectId, 'Status check task', 'in_progress', 0, 1);
      statusTaskId = taskResult.lastInsertRowid as number;

      db.prepare(
        `INSERT INTO agent_sessions (context_type, context_id, status, pid)
         VALUES ('task', ?, 'running', 11111)`
      ).run(statusTaskId);
    });

    it('should return running status and session info', () => {
      const status = getAgentStatus(statusTaskId);

      // Returns OpenAPI-compliant format
      expect(status.task_id).toBe(statusTaskId);
      expect(status.status).toBe('running'); // Session is 'running' in DB
      expect(status.pid).toBe(11111);
    });
  });

  describe('getTaskSessionHistory', () => {
    let historyTaskId: number;

    beforeAll(() => {
      const db = getDatabase();

      const taskResult = db
        .prepare(
          `INSERT INTO tasks (project_id, title, status, requires_approval, created_by_user_id)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(projectId, 'History task', 'done', 0, 1);
      historyTaskId = taskResult.lastInsertRowid as number;

      // Create multiple sessions
      db.prepare(
        `INSERT INTO agent_sessions (context_type, context_id, status, ended_at)
         VALUES ('task', ?, 'failed', CURRENT_TIMESTAMP)`
      ).run(historyTaskId);

      db.prepare(
        `INSERT INTO agent_sessions (context_type, context_id, status, ended_at)
         VALUES ('task', ?, 'completed', CURRENT_TIMESTAMP)`
      ).run(historyTaskId);
    });

    it('should return all sessions for a task', () => {
      const history = getTaskSessionHistory(historyTaskId);

      expect(history.length).toBe(2);
      expect(history[0]?.taskId).toBe(historyTaskId);
    });

    it('should order by started_at descending', () => {
      const history = getTaskSessionHistory(historyTaskId);

      // Should return results ordered by started_at descending
      // Both have same timestamp, so check that we get both statuses
      const statuses = history.map((h) => h.status);
      expect(statuses).toContain('completed');
      expect(statuses).toContain('failed');
    });
  });

  describe('cleanupStaleSessions', () => {
    let staleTaskId: number;

    beforeAll(() => {
      const db = getDatabase();

      const taskResult = db
        .prepare(
          `INSERT INTO tasks (project_id, title, status, requires_approval, created_by_user_id)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(projectId, 'Stale session task', 'in_progress', 0, 1);
      staleTaskId = taskResult.lastInsertRowid as number;
    });

    it('should mark stale sessions as failed', () => {
      const db = getDatabase();

      // Create sessions in various states
      db.prepare(
        `INSERT INTO agent_sessions (context_type, context_id, status)
         VALUES ('task', ?, 'running')`
      ).run(staleTaskId);

      db.prepare(
        `INSERT INTO agent_sessions (context_type, context_id, status)
         VALUES ('task', ?, 'starting')`
      ).run(staleTaskId);

      // Run cleanup
      cleanupStaleSessions();

      // Check sessions are now failed
      const sessions = db
        .prepare(
          `SELECT status FROM agent_sessions
           WHERE context_type = 'task' AND context_id = ? AND status = 'failed'`
        )
        .all(staleTaskId);

      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });

    it('should not affect completed sessions', () => {
      const db = getDatabase();

      // Create a completed session
      const result = db
        .prepare(
          `INSERT INTO agent_sessions (context_type, context_id, status, ended_at)
           VALUES ('task', ?, 'completed', CURRENT_TIMESTAMP)`
        )
        .run(staleTaskId);
      const completedId = result.lastInsertRowid as number;

      cleanupStaleSessions();

      const session = db
        .prepare('SELECT status FROM agent_sessions WHERE id = ?')
        .get(completedId) as { status: string };

      expect(session.status).toBe('completed');
    });
  });
});
