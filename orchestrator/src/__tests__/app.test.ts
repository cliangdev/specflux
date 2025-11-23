import request from 'supertest';
import app from '../app';
import { getDatabase } from '../db';

describe('Express Application', () => {
  describe('Middleware', () => {
    it('should return JSON content type', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should have security headers from helmet', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });

  describe('Authentication', () => {
    it('should allow access without X-User-Id header (optional auth)', async () => {
      const response = await request(app).get('/api/projects');

      // Auth is optional during early development
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow access to /api/health without authentication', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-api routes', async () => {
      const response = await request(app).get('/some-random-path');

      expect(response.status).toBe(404);
    });
  });

  describe('JSON Parsing', () => {
    it('should accept JSON payloads', async () => {
      const uniqueName = `JSON Parse Test ${Date.now()}`;
      const response = await request(app)
        .post('/api/projects')
        .send({ name: uniqueName, local_path: '/test' })
        .set('Content-Type', 'application/json');

      // With optional auth, request proceeds (may fail validation but parses JSON)
      // Status should not be 415 (unsupported media type)
      expect(response.status).not.toBe(415);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Project Creation (Optional Auth)', () => {
    beforeEach(() => {
      // Ensure default user (ID 1) exists for optional auth mode
      const db = getDatabase();
      db.exec(`
        INSERT OR IGNORE INTO users (id, email, display_name)
        VALUES (1, 'default@specflux.dev', 'Default User')
      `);
    });

    it('should create a project without X-User-Id header using default user', async () => {
      const uniqueName = `Test Project ${Date.now()}`;
      const response = await request(app)
        .post('/api/projects')
        .send({ name: uniqueName, local_path: '/test/path' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(uniqueName);
      expect(response.body.data.local_path).toBe('/test/path');
    });

    it('should list created projects without X-User-Id header', async () => {
      const uniqueName = `List Test Project ${Date.now()}`;
      // First create a project
      await request(app)
        .post('/api/projects')
        .send({ name: uniqueName, local_path: '/list/test' })
        .set('Content-Type', 'application/json');

      // Then list projects
      const response = await request(app).get('/api/projects');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should reject duplicate project names for same user', async () => {
      const uniqueName = `Duplicate Test ${Date.now()}`;
      // Create first project
      const first = await request(app)
        .post('/api/projects')
        .send({ name: uniqueName, local_path: '/first/path' })
        .set('Content-Type', 'application/json');

      expect(first.status).toBe(201);

      // Try to create duplicate
      const second = await request(app)
        .post('/api/projects')
        .send({ name: uniqueName, local_path: '/second/path' })
        .set('Content-Type', 'application/json');

      expect(second.status).toBe(400); // ValidationError for duplicate name
      expect(second.body.success).toBe(false);
      expect(second.body.error).toContain('already exists');
    });
  });
});
