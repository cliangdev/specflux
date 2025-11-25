import request from 'supertest';
import app from '../app';
import { getDatabase } from '../db';

// Mock node-pty since we can't spawn real PTYs in tests
jest.mock('node-pty', () => ({
  spawn: jest.fn(),
}));

describe('Agent API Routes', () => {
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
    const uniqueName = `Agent Routes Test Project ${Date.now()}`;
    const result = db
      .prepare(
        `INSERT INTO projects (project_id, name, local_path, owner_user_id)
         VALUES (?, ?, ?, ?)`
      )
      .run(`agent-routes-test-${Date.now()}`, uniqueName, '/test/agent-routes', 1);
    projectId = result.lastInsertRowid as number;

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
      .run(projectId, 'Agent routes test task', 'ready', 0, 1);
    taskId = taskResult.lastInsertRowid as number;
  });

  describe('GET /api/tasks/:id/agent', () => {
    it('should return agent status for valid task', async () => {
      const response = await request(app).get(`/api/tasks/${taskId}/agent`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('task_id');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data.task_id).toBe(taskId);
      expect(response.body.data.status).toBe('idle');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app).get('/api/tasks/99999/agent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks/:id/agent/history', () => {
    beforeAll(() => {
      // Create some session history
      const db = getDatabase();
      db.prepare(
        `INSERT INTO agent_sessions (context_type, context_id, status, ended_at)
         VALUES ('task', ?, 'completed', CURRENT_TIMESTAMP)`
      ).run(taskId);
    });

    it('should return session history for valid task', async () => {
      const response = await request(app).get(`/api/tasks/${taskId}/agent/history`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app).get('/api/tasks/99999/agent/history');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/agents', () => {
    it('should return list of running agents', async () => {
      const response = await request(app).get('/api/agents');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      // No agents running in tests (mocked)
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('POST /api/tasks/:id/agent/start', () => {
    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .post('/api/tasks/99999/agent/start')
        .send({})
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    // Note: Can't test successful spawn without real PTY/project setup
  });

  describe('POST /api/tasks/:id/agent/stop', () => {
    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .post('/api/tasks/99999/agent/stop')
        .send({})
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should succeed even when no agent is running (idempotent)', async () => {
      const response = await request(app)
        .post(`/api/tasks/${taskId}/agent/stop`)
        .send({})
        .set('Content-Type', 'application/json');

      // stopAgent is idempotent - stopping when nothing is running is fine
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
