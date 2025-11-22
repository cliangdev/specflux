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
    it('should return 401 for authenticated routes without X-User-Id header', async () => {
      const response = await request(app).get('/api/projects');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Missing X-User-Id header',
      });
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

      // Without X-User-Id header, should return 401
      expect(response.status).toBe(401);
    });
  });
});
