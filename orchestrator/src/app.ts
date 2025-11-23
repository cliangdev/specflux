import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import { AppError } from './types';
import { loadOpenAPISpec } from './swagger';

const app = express();

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI - setup async
const setupSwagger = async () => {
  try {
    const spec = await loadOpenAPISpec();
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
    console.log('Swagger UI available at /api-docs');
  } catch (error) {
    console.error('Failed to setup Swagger UI:', error);
  }
};
void setupSwagger();

// Routes
app.use('/api', routes);

// 404 handler - skip WebSocket upgrade requests
app.use((req: Request, res: Response) => {
  // Don't respond to WebSocket upgrade requests - let them pass to HTTP server
  if (req.headers.upgrade?.toLowerCase() === 'websocket') {
    return;
  }

  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: process.env['NODE_ENV'] === 'production' ? 'Internal server error' : err.message,
  });
});

export default app;
