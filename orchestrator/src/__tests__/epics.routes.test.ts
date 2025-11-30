import request from 'supertest';
import app from '../app';
import { getDatabase } from '../db';

// Helper to set auth header for all requests
const authHeader = { 'X-User-Id': '1' };

describe('Epics API Routes', () => {
  let projectId: number;

  beforeAll(() => {
    // Ensure default user exists
    const db = getDatabase();
    db.exec(`
      INSERT OR IGNORE INTO users (id, email, display_name)
      VALUES (1, 'default@specflux.dev', 'Default User')
    `);

    // Create a test project
    const uniqueName = `Epics Test Project ${Date.now()}`;
    const result = db
      .prepare(
        `INSERT INTO projects (project_id, name, local_path, owner_user_id)
         VALUES (?, ?, ?, ?)`
      )
      .run(`epics-test-${Date.now()}`, uniqueName, '/test/epics', 1);
    projectId = result.lastInsertRowid as number;

    // Add user as project member
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES (?, ?, 'owner')`
    ).run(projectId, 1);
  });

  describe('POST /api/projects/:projectId/epics', () => {
    it('should create an epic with required fields only', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/epics`)
        .set(authHeader)
        .send({
          title: 'Test Epic',
          acceptance_criteria: ['Epic completes successfully'],
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Test Epic');
      expect(response.body.data.project_id).toBe(projectId);
    });

    it('should create an epic with all optional fields', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/epics`)
        .set(authHeader)
        .send({
          title: 'Full Epic',
          description: 'A detailed description',
          acceptance_criteria: ['All tasks complete'],
          prd_file_path: '/docs/prd.md',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Full Epic');
      expect(response.body.data.description).toBe('A detailed description');
      expect(response.body.data.prd_file_path).toBe('/docs/prd.md');
    });

    it('should reject epic creation without title', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/epics`)
        .set(authHeader)
        .send({ description: 'No title provided' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .post('/api/projects/99999/epics')
        .set(authHeader)
        .send({
          title: 'Test Epic',
          acceptance_criteria: ['Test criteria'],
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/projects/:projectId/epics', () => {
    it('should list epics for a project', async () => {
      const response = await request(app).get(`/api/projects/${projectId}/epics`).set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app).get('/api/projects/99999/epics').set(authHeader);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/epics/:id', () => {
    let epicId: number;

    beforeAll(async () => {
      // Create an epic to test with
      const response = await request(app)
        .post(`/api/projects/${projectId}/epics`)
        .set(authHeader)
        .send({
          title: 'Epic for GET test',
          acceptance_criteria: ['GET test criteria'],
        })
        .set('Content-Type', 'application/json');
      epicId = response.body.data.id;
    });

    it('should get epic by id', async () => {
      const response = await request(app).get(`/api/epics/${epicId}`).set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(epicId);
      expect(response.body.data.title).toBe('Epic for GET test');
    });

    it('should return 404 for non-existent epic', async () => {
      const response = await request(app).get('/api/epics/99999').set(authHeader);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/epics/:id', () => {
    let epicId: number;

    beforeAll(async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/epics`)
        .set(authHeader)
        .send({
          title: 'Epic for PUT test',
          acceptance_criteria: ['PUT test criteria'],
        })
        .set('Content-Type', 'application/json');
      epicId = response.body.data.id;
    });

    it('should update epic title', async () => {
      const response = await request(app)
        .put(`/api/epics/${epicId}`)
        .set(authHeader)
        .send({ title: 'Updated Epic Title' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Epic Title');
    });

    it('should update epic status', async () => {
      const response = await request(app)
        .put(`/api/epics/${epicId}`)
        .set(authHeader)
        .send({ status: 'active' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('active');
    });

    it('should update epic description', async () => {
      const response = await request(app)
        .put(`/api/epics/${epicId}`)
        .set(authHeader)
        .send({ description: 'Updated description' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should return 404 for non-existent epic', async () => {
      const response = await request(app)
        .put('/api/epics/99999')
        .set(authHeader)
        .send({ title: 'Updated' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/epics/:id', () => {
    it('should delete an epic', async () => {
      // Create an epic to delete
      const createResponse = await request(app)
        .post(`/api/projects/${projectId}/epics`)
        .set(authHeader)
        .send({
          title: 'Epic to Delete',
          acceptance_criteria: ['Delete test criteria'],
        })
        .set('Content-Type', 'application/json');
      const epicId = createResponse.body.data.id;

      // Delete it
      const deleteResponse = await request(app).delete(`/api/epics/${epicId}`).set(authHeader);
      expect(deleteResponse.status).toBe(204);

      // Verify it's gone
      const getResponse = await request(app).get(`/api/epics/${epicId}`).set(authHeader);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent epic', async () => {
      const response = await request(app).delete('/api/epics/99999').set(authHeader);
      expect(response.status).toBe(404);
    });

    it('should cascade delete acceptance criteria when epic is deleted', async () => {
      const db = getDatabase();

      // Create an epic with acceptance criteria
      const createResponse = await request(app)
        .post(`/api/projects/${projectId}/epics`)
        .set(authHeader)
        .send({
          title: 'Epic with Criteria to Delete',
          acceptance_criteria: ['Criterion 1', 'Criterion 2', 'Criterion 3'],
        })
        .set('Content-Type', 'application/json');
      const epicId = createResponse.body.data.id;

      // Verify acceptance criteria exist
      const criteriaBeforeDelete = db
        .prepare(
          "SELECT COUNT(*) as count FROM acceptance_criteria WHERE entity_type = 'epic' AND entity_id = ?"
        )
        .get(epicId) as { count: number };
      expect(criteriaBeforeDelete.count).toBe(3);

      // Delete the epic
      const deleteResponse = await request(app).delete(`/api/epics/${epicId}`).set(authHeader);
      expect(deleteResponse.status).toBe(204);

      // Verify acceptance criteria are also deleted
      const criteriaAfterDelete = db
        .prepare(
          "SELECT COUNT(*) as count FROM acceptance_criteria WHERE entity_type = 'epic' AND entity_id = ?"
        )
        .get(epicId) as { count: number };
      expect(criteriaAfterDelete.count).toBe(0);
    });

    it('should unlink tasks but not delete them when epic is deleted', async () => {
      const db = getDatabase();

      // Create an epic
      const epicResponse = await request(app)
        .post(`/api/projects/${projectId}/epics`)
        .set(authHeader)
        .send({
          title: 'Epic with Tasks',
          acceptance_criteria: ['Epic criteria'],
        })
        .set('Content-Type', 'application/json');
      const epicId = epicResponse.body.data.id;

      // Create a task linked to the epic
      const taskResponse = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .send({
          title: 'Task linked to Epic',
          acceptance_criteria: ['Task criteria'],
          epic_id: epicId,
        })
        .set('Content-Type', 'application/json');
      const taskId = taskResponse.body.data.id;

      // Verify task is linked to epic
      const taskBefore = db.prepare('SELECT epic_id FROM tasks WHERE id = ?').get(taskId) as {
        epic_id: number | null;
      };
      expect(taskBefore.epic_id).toBe(epicId);

      // Delete the epic
      const deleteResponse = await request(app).delete(`/api/epics/${epicId}`).set(authHeader);
      expect(deleteResponse.status).toBe(204);

      // Verify task still exists but is unlinked
      const taskAfter = db.prepare('SELECT id, epic_id FROM tasks WHERE id = ?').get(taskId) as
        | { id: number; epic_id: number | null }
        | undefined;
      expect(taskAfter).toBeDefined();
      expect(taskAfter!.id).toBe(taskId);
      expect(taskAfter!.epic_id).toBeNull();
    });
  });
});
