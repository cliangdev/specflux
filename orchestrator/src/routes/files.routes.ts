import { Router, Request, Response, NextFunction } from 'express';
import { getProjectById, userHasProjectAccess } from '../services/project.service';
import { NotFoundError, ValidationError, AppError } from '../types';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified_at?: string;
}

/**
 * Recursively list files in a directory
 */
function listFilesRecursive(
  dirPath: string,
  basePath: string,
  maxDepth: number = 3,
  currentDepth: number = 0
): FileEntry[] {
  if (currentDepth >= maxDepth) {
    return [];
  }

  const entries: FileEntry[] = [];

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      // Skip hidden files and node_modules
      if (item.startsWith('.') || item === 'node_modules') {
        continue;
      }

      const fullPath = path.join(dirPath, item);
      const relativePath = path.relative(basePath, fullPath);

      try {
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          entries.push({
            name: item,
            path: relativePath,
            type: 'directory',
          });

          // Recurse into directory
          const children = listFilesRecursive(fullPath, basePath, maxDepth, currentDepth + 1);
          entries.push(...children);
        } else {
          entries.push({
            name: item,
            path: relativePath,
            type: 'file',
            size: stats.size,
            modified_at: stats.mtime.toISOString(),
          });
        }
      } catch {
        // Skip files we can't access
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return entries;
}

/**
 * GET /projects/:projectId/files - List files in project's .specflux directory
 */
router.get('/projects/:projectId/files', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const project = getProjectById(projectId);

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const specfluxDir = path.join(project.local_path, '.specflux');

    if (!fs.existsSync(specfluxDir)) {
      res.json({ success: true, data: [] });
      return;
    }

    const files = listFilesRecursive(specfluxDir, specfluxDir);

    res.json({ success: true, data: files });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /files/* - Get file content
 * Path should be relative to project's .specflux directory
 */
router.get('/files/:projectId/*', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);
    const filePath = req.params['0'] ?? '';

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!filePath) {
      throw new ValidationError('File path is required');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const project = getProjectById(projectId);

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Security: ensure path doesn't escape .specflux directory
    const specfluxDir = path.join(project.local_path, '.specflux');
    const fullPath = path.resolve(specfluxDir, filePath);

    if (!fullPath.startsWith(specfluxDir)) {
      throw new AppError(403, 'Access denied: path outside .specflux directory');
    }

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('File', filePath);
    }

    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      throw new ValidationError('Path is a directory, not a file');
    }

    const content = fs.readFileSync(fullPath, 'utf-8');

    res.json({
      success: true,
      data: {
        path: filePath,
        content,
        size: stats.size,
        modified_at: stats.mtime.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /files/* - Update file content
 */
router.put('/files/:projectId/*', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);
    const filePath = req.params['0'] ?? '';

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!filePath) {
      throw new ValidationError('File path is required');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const project = getProjectById(projectId);

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const body = req.body as Record<string, unknown>;
    const { content } = body;

    if (typeof content !== 'string') {
      throw new ValidationError('content is required and must be a string');
    }

    // Security: ensure path doesn't escape .specflux directory
    const specfluxDir = path.join(project.local_path, '.specflux');
    const fullPath = path.resolve(specfluxDir, filePath);

    if (!fullPath.startsWith(specfluxDir)) {
      throw new AppError(403, 'Access denied: path outside .specflux directory');
    }

    // Create directory if it doesn't exist
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');

    const stats = fs.statSync(fullPath);

    res.json({
      success: true,
      data: {
        path: filePath,
        size: stats.size,
        modified_at: stats.mtime.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
