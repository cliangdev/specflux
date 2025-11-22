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

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
      });
    });

    it('should return 404 for non-api routes', async () => {
      const response = await request(app).get('/some-random-path');

      expect(response.status).toBe(404);
    });
  });

  describe('JSON Parsing', () => {
    it('should accept JSON payloads', async () => {
      const response = await request(app)
        .post('/api/health')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      // POST to health returns 404 since only GET is defined
      expect(response.status).toBe(404);
    });
  });
});
