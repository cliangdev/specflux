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
        .send({
          title: 'Test Task',
          acceptance_criteria: ['Task completes successfully'],
        })
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
          acceptance_criteria: ['All tests pass'],
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
          acceptance_criteria: ['Approval obtained'],
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
          acceptance_criteria: ['No approval needed'],
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
        .send({
          title: 'Test Task',
          acceptance_criteria: ['Test criteria'],
        })
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
      expect(response.body.pagination).toHaveProperty('has_more');
      expect(response.body.pagination).toHaveProperty('next_cursor');
      expect(response.body.pagination).toHaveProperty('prev_cursor');
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
        .send({
          title: 'Task for GET test',
          acceptance_criteria: ['GET test criteria'],
        })
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
        .send({
          title: 'Task for PATCH test',
          acceptance_criteria: ['PATCH test criteria'],
        })
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

  describe('Definition of Ready (DoR) fields', () => {
    let taskId: number;

    beforeAll(async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({
          title: 'DoR Test Task',
          acceptance_criteria: ['DoR test criteria'],
        })
        .set('Content-Type', 'application/json');
      taskId = response.body.data.id;
    });

    it('should create task with DoR fields', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({
          title: 'Task with DoR fields',
          acceptance_criteria: ['Unit tests pass', 'Integration tests pass'],
          scope_in: 'Backend API changes only',
          scope_out: 'Frontend UI, documentation',
          owner_user_id: 1,
          executor_type: 'agent',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      // acceptance_criteria is stored as markdown format
      expect(response.body.data.acceptance_criteria).toBe(
        '- Unit tests pass\n- Integration tests pass'
      );
      expect(response.body.data.scope_in).toBe('Backend API changes only');
      expect(response.body.data.scope_out).toBe('Frontend UI, documentation');
      expect(response.body.data.owner_user_id).toBe(1);
      expect(response.body.data.executor_type).toBe('agent');
    });

    it('should default executor_type to agent', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({
          title: 'Task with default executor',
          acceptance_criteria: ['Default executor test'],
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.data.executor_type).toBe('agent');
    });

    it('should allow executor_type to be human', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({
          title: 'Human executed task',
          acceptance_criteria: ['Human executor test'],
          executor_type: 'human',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.data.executor_type).toBe('human');
    });

    it('should update acceptance_criteria via PATCH', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({
          acceptance_criteria: '- [x] Migration created\n- [ ] Tests pass',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.data.acceptance_criteria).toBe(
        '- [x] Migration created\n- [ ] Tests pass'
      );
    });

    it('should update scope fields via PATCH', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({
          scope_in: 'Database schema changes',
          scope_out: 'API endpoints, Frontend',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.data.scope_in).toBe('Database schema changes');
      expect(response.body.data.scope_out).toBe('API endpoints, Frontend');
    });

    it('should update owner_user_id via PATCH', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ owner_user_id: 1 })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.data.owner_user_id).toBe(1);
    });

    it('should update executor_type via PATCH', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ executor_type: 'human' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.data.executor_type).toBe('human');

      // Change back to agent
      const response2 = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ executor_type: 'agent' })
        .set('Content-Type', 'application/json');

      expect(response2.status).toBe(200);
      expect(response2.body.data.executor_type).toBe('agent');
    });

    it('should clear DoR fields when set to null', async () => {
      // First set some values
      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({
          acceptance_criteria: 'Some criteria',
          scope_in: 'Some scope',
        })
        .set('Content-Type', 'application/json');

      // Then clear them
      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({
          acceptance_criteria: null,
          scope_in: null,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.data.acceptance_criteria).toBeNull();
      expect(response.body.data.scope_in).toBeNull();
    });

    it('should return DoR fields in GET response', async () => {
      // Set DoR fields first
      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({
          acceptance_criteria: ['Test criteria'],
          scope_in: 'Test scope in',
          scope_out: 'Test scope out',
          owner_user_id: 1,
          executor_type: 'agent',
        })
        .set('Content-Type', 'application/json');

      const response = await request(app).get(`/api/tasks/${taskId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('acceptance_criteria');
      expect(response.body.data).toHaveProperty('scope_in');
      expect(response.body.data).toHaveProperty('scope_out');
      expect(response.body.data).toHaveProperty('owner_user_id');
      expect(response.body.data).toHaveProperty('executor_type');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task', async () => {
      // Create a task to delete
      const createResponse = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({
          title: 'Task to Delete',
          acceptance_criteria: ['Delete test criteria'],
        })
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
