import request from 'supertest';
import app from '../app';

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
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Test', local_path: '/test' })
        .set('Content-Type', 'application/json');

      // With optional auth, request proceeds (may fail validation but parses JSON)
      // Status should not be 415 (unsupported media type)
      expect(response.status).not.toBe(415);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
