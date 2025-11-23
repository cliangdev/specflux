import request from 'supertest';
import app from '../app';
import { getDatabase } from '../db';

describe('Tasks API Routes', () => {
  let projectId: number;

  beforeAll(() => {
    // Ensure default user exists
    const db = getDatabase();
    db.exec(`
      INSERT OR IGNORE INTO users (id, email, display_name)
      VALUES (1, 'default@specflux.dev', 'Default User')
    `);

    // Create a test project
    const uniqueName = `Tasks Test Project ${Date.now()}`;
    const result = db
      .prepare(
        `INSERT INTO projects (project_id, name, local_path, owner_user_id)
         VALUES (?, ?, ?, ?)`
      )
      .run(`tasks-test-${Date.now()}`, uniqueName, '/test/tasks', 1);
    projectId = result.lastInsertRowid as number;

    // Add user as project member
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES (?, ?, 'owner')`
    ).run(projectId, 1);
  });

  describe('POST /api/projects/:projectId/tasks', () => {
    it('should create a task with required fields only', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({ title: 'Test Task' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Test Task');
      expect(response.body.data.project_id).toBe(projectId);
    });

    it('should create a task with all optional fields', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({
          title: 'Full Task',
          description: 'A detailed description',
          requires_approval: false,
          repo_name: 'my-repo',
          agent_name: 'claude-code',
          estimated_duration: 3600,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Full Task');
      expect(response.body.data.description).toBe('A detailed description');
      expect(response.body.data.repo_name).toBe('my-repo');
      expect(response.body.data.agent_name).toBe('claude-code');
      expect(response.body.data.estimated_duration).toBe(3600);
    });

    it('should create a task with requires_approval=true (boolean)', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({
          title: 'Approval Required Task',
          requires_approval: true,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.data.requires_approval).toBe(1); // SQLite stores as integer
    });

    it('should create a task with requires_approval=false (boolean)', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({
          title: 'No Approval Task',
          requires_approval: false,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.data.requires_approval).toBe(0); // SQLite stores as integer
    });

    it('should reject task creation without title', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({ description: 'No title provided' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('title');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .post('/api/projects/99999/tasks')
        .send({ title: 'Test Task' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/projects/:projectId/tasks', () => {
    it('should list tasks for a project', async () => {
      const response = await request(app).get(`/api/projects/${projectId}/tasks`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app).get('/api/projects/99999/tasks');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/tasks/:id', () => {
    let taskId: number;

    beforeAll(async () => {
      // Create a task to test with
      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({ title: 'Task for GET test' })
        .set('Content-Type', 'application/json');
      taskId = response.body.data.id;
    });

    it('should get task by id', async () => {
      const response = await request(app).get(`/api/tasks/${taskId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(taskId);
      expect(response.body.data.title).toBe('Task for GET test');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app).get('/api/tasks/99999');

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    let taskId: number;

    beforeAll(async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({ title: 'Task for PATCH test' })
        .set('Content-Type', 'application/json');
      taskId = response.body.data.id;
    });

    it('should update task title', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ title: 'Updated Title' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
    });

    it('should update task status', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ status: 'in_progress' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('in_progress');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .patch('/api/tasks/99999')
        .send({ title: 'Updated' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task', async () => {
      // Create a task to delete
      const createResponse = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({ title: 'Task to Delete' })
        .set('Content-Type', 'application/json');
      const taskId = createResponse.body.data.id;

      // Delete it
      const deleteResponse = await request(app).delete(`/api/tasks/${taskId}`);
      expect(deleteResponse.status).toBe(204);

      // Verify it's gone
      const getResponse = await request(app).get(`/api/tasks/${taskId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app).delete('/api/tasks/99999');
      expect(response.status).toBe(404);
    });
  });
});
