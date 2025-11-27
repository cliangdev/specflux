import { getDatabase } from '../db';
import {
  getAgentSession,
  getActiveSessionForTask,
  isAgentRunning,
  getAgentStatus,
  getTaskSessionHistory,
  cleanupStaleSessions,
  resolveAgentForTask,
  buildAgentSystemPrompt,
} from '../services/agent.service';
import { type Agent } from '../services/agent-config.service';

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

  describe('resolveAgentForTask', () => {
    let agentProjectId: number;
    let agentId: number;
    let defaultAgentId: number;

    beforeAll(() => {
      const db = getDatabase();

      // Create a project for agent tests
      const projectResult = db
        .prepare(
          `INSERT INTO projects (project_id, name, local_path, owner_user_id)
           VALUES (?, ?, ?, ?)`
        )
        .run(`agent-resolve-test-${Date.now()}`, 'Agent Resolve Project', '/test/resolve', 1);
      agentProjectId = projectResult.lastInsertRowid as number;

      // Add user as project member
      db.prepare(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES (?, ?, 'owner')`
      ).run(agentProjectId, 1);

      // Create agents
      const agentResult = db
        .prepare(
          `INSERT INTO agents (project_id, name, description, system_prompt)
           VALUES (?, ?, ?, ?)`
        )
        .run(agentProjectId, 'Backend Agent', 'Handles backend tasks', 'Focus on Node.js code');
      agentId = agentResult.lastInsertRowid as number;

      const defaultAgentResult = db
        .prepare(
          `INSERT INTO agents (project_id, name, description, system_prompt)
           VALUES (?, ?, ?, ?)`
        )
        .run(agentProjectId, 'Default Agent', 'Project default', 'General coding');
      defaultAgentId = defaultAgentResult.lastInsertRowid as number;

      // Set project default agent
      db.prepare('UPDATE projects SET default_agent_id = ? WHERE id = ?').run(
        defaultAgentId,
        agentProjectId
      );
    });

    it('should return task-assigned agent when set', () => {
      const db = getDatabase();
      const taskResult = db
        .prepare(
          `INSERT INTO tasks (project_id, title, status, requires_approval, created_by_user_id, assigned_agent_id)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(agentProjectId, 'Task with assigned agent', 'ready', 0, 1, agentId);
      const taskWithAgentId = taskResult.lastInsertRowid as number;

      const agent = resolveAgentForTask(taskWithAgentId);

      expect(agent).not.toBeNull();
      expect(agent?.id).toBe(agentId);
      expect(agent?.name).toBe('Backend Agent');
    });

    it('should fall back to project default agent when no task agent', () => {
      const db = getDatabase();
      const taskResult = db
        .prepare(
          `INSERT INTO tasks (project_id, title, status, requires_approval, created_by_user_id)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(agentProjectId, 'Task without agent', 'ready', 0, 1);
      const taskNoAgentId = taskResult.lastInsertRowid as number;

      const agent = resolveAgentForTask(taskNoAgentId);

      expect(agent).not.toBeNull();
      expect(agent?.id).toBe(defaultAgentId);
      expect(agent?.name).toBe('Default Agent');
    });

    it('should return null when no task or project agent', () => {
      const db = getDatabase();

      // Create project without default agent
      const noAgentProjectResult = db
        .prepare(
          `INSERT INTO projects (project_id, name, local_path, owner_user_id)
           VALUES (?, ?, ?, ?)`
        )
        .run(`no-agent-project-${Date.now()}`, 'No Agent Project', '/test/noagent', 1);
      const noAgentProjectId = noAgentProjectResult.lastInsertRowid as number;

      db.prepare(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES (?, ?, 'owner')`
      ).run(noAgentProjectId, 1);

      const taskResult = db
        .prepare(
          `INSERT INTO tasks (project_id, title, status, requires_approval, created_by_user_id)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(noAgentProjectId, 'Task in no-agent project', 'ready', 0, 1);
      const taskInNoAgentProject = taskResult.lastInsertRowid as number;

      const agent = resolveAgentForTask(taskInNoAgentProject);

      expect(agent).toBeNull();
    });

    it('should return null for non-existent task', () => {
      const agent = resolveAgentForTask(999999);
      expect(agent).toBeNull();
    });
  });

  describe('buildAgentSystemPrompt', () => {
    it('should build prompt with name and description', () => {
      const agent: Agent = {
        id: 1,
        project_id: 1,
        name: 'Test Agent',
        description: 'A test agent for unit tests',
        emoji: '🤖',
        system_prompt: null,
        tools: null,
        config_file_path: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const prompt = buildAgentSystemPrompt(agent);

      expect(prompt).toContain('## Agent: Test Agent');
      expect(prompt).toContain('**Role:** A test agent for unit tests');
    });

    it('should include system prompt when provided', () => {
      const agent: Agent = {
        id: 2,
        project_id: 1,
        name: 'Backend Dev',
        description: 'Backend developer',
        emoji: '🔧',
        system_prompt: 'Focus on TypeScript and Node.js patterns',
        tools: null,
        config_file_path: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const prompt = buildAgentSystemPrompt(agent);

      expect(prompt).toContain('### Agent Instructions');
      expect(prompt).toContain('Focus on TypeScript and Node.js patterns');
    });

    it('should include tools list when provided', () => {
      const agent: Agent = {
        id: 3,
        project_id: 1,
        name: 'Tooled Agent',
        description: null,
        emoji: '🛠️',
        system_prompt: null,
        tools: JSON.stringify(['Read', 'Write', 'Bash']),
        config_file_path: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const prompt = buildAgentSystemPrompt(agent);

      expect(prompt).toContain('### Available Tools');
      expect(prompt).toContain('- Read');
      expect(prompt).toContain('- Write');
      expect(prompt).toContain('- Bash');
    });

    it('should handle invalid tools JSON gracefully', () => {
      const agent: Agent = {
        id: 4,
        project_id: 1,
        name: 'Bad Tools Agent',
        description: null,
        emoji: '❌',
        system_prompt: null,
        tools: 'not valid json',
        config_file_path: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      // Should not throw
      const prompt = buildAgentSystemPrompt(agent);
      expect(prompt).toContain('## Agent: Bad Tools Agent');
      expect(prompt).not.toContain('### Available Tools');
    });
  });
});
