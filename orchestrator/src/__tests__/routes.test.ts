import request from 'supertest';
import express from 'express';
import routes from '../routes';

describe('API Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', routes);
  });

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'healthy',
        },
      });
    });

    it('should return a valid timestamp', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.data.timestamp).toBeDefined();
      const timestamp = new Date(response.body.data.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should return a version string', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.data.version).toBeDefined();
      expect(typeof response.body.data.version).toBe('string');
    });
  });
});
