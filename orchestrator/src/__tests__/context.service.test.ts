import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db';
import {
  getTaskContext,
  generateContextMarkdown,
  writeContextFile,
  readContextFile,
  deleteContextFile,
  TaskContext,
} from '../services/context.service';

describe('ContextService', () => {
  let projectId: number;
  let taskId: number;
  let dependencyTaskId: number;
  const testDir = path.join(__dirname, '../../test-context-dir');

  beforeAll(() => {
    const db = getDatabase();

    // Ensure default user exists
    db.exec(`
      INSERT OR IGNORE INTO users (id, email, display_name)
      VALUES (1, 'default@specflux.dev', 'Default User')
    `);

    // Create a test project
    const projectResult = db
      .prepare(
        `INSERT INTO projects (project_id, name, local_path, owner_user_id)
         VALUES (?, ?, ?, ?)`
      )
      .run(`context-test-${Date.now()}`, 'Context Test Project', '/test/context', 1);
    projectId = projectResult.lastInsertRowid as number;

    // Add user as project member
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES (?, ?, 'owner')`
    ).run(projectId, 1);

    // Create a dependency task
    const depResult = db
      .prepare(
        `INSERT INTO tasks (project_id, title, description, status, requires_approval, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(projectId, 'Setup database', 'Configure database connection', 'done', 0, 1);
    dependencyTaskId = depResult.lastInsertRowid as number;

    // Create main task
    const taskResult = db
      .prepare(
        `INSERT INTO tasks (project_id, title, description, status, requires_approval, repo_name, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        projectId,
        'Implement user authentication',
        'Add JWT-based authentication with login and signup endpoints',
        'ready',
        1,
        'backend-api',
        1
      );
    taskId = taskResult.lastInsertRowid as number;

    // Add dependency
    db.prepare(
      `INSERT INTO task_dependencies (task_id, depends_on_task_id)
       VALUES (?, ?)`
    ).run(taskId, dependencyTaskId);

    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('getTaskContext', () => {
    it('should return task context with all details', () => {
      const context = getTaskContext(taskId);

      expect(context).not.toBeNull();
      expect(context?.task.id).toBe(taskId);
      expect(context?.task.title).toBe('Implement user authentication');
      expect(context?.projectName).toBe('Context Test Project');
    });

    it('should include dependencies', () => {
      const context = getTaskContext(taskId);

      expect(context?.dependencies).toHaveLength(1);
      expect(context?.dependencies[0]?.id).toBe(dependencyTaskId);
      expect(context?.dependencies[0]?.title).toBe('Setup database');
      expect(context?.dependencies[0]?.status).toBe('done');
    });

    it('should return null for non-existent task', () => {
      const context = getTaskContext(99999);
      expect(context).toBeNull();
    });
  });

  describe('generateContextMarkdown', () => {
    it('should generate markdown with task title and description', () => {
      const context = getTaskContext(taskId)!;
      const markdown = generateContextMarkdown(context);

      expect(markdown).toContain('# Task Context');
      expect(markdown).toContain('**Title:** Implement user authentication');
      expect(markdown).toContain('Add JWT-based authentication');
    });

    it('should include project name', () => {
      const context = getTaskContext(taskId)!;
      const markdown = generateContextMarkdown(context);

      expect(markdown).toContain('**Project:** Context Test Project');
    });

    it('should include repository name when present', () => {
      const context = getTaskContext(taskId)!;
      const markdown = generateContextMarkdown(context);

      expect(markdown).toContain('**Repository:** backend-api');
    });

    it('should include dependencies section', () => {
      const context = getTaskContext(taskId)!;
      const markdown = generateContextMarkdown(context);

      expect(markdown).toContain('## Dependencies');
      expect(markdown).toContain('Setup database');
      expect(markdown).toContain('✅'); // done status icon
    });

    it('should handle task without dependencies', () => {
      const context: TaskContext = {
        task: {
          id: 999,
          project_id: projectId,
          epic_id: null,
          title: 'Simple task',
          description: 'A simple task',
          status: 'ready',
          requires_approval: false,
          repo_name: null,
          agent_name: null,
          progress_percentage: 0,
          estimated_duration: null,
          actual_duration: null,
          github_issue_number: null,
          github_branch_name: null,
          github_pr_number: null,
          file_path: null,
          created_by_user_id: 1,
          assigned_to_user_id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        dependencies: [],
        projectName: 'Test Project',
      };

      const markdown = generateContextMarkdown(context);
      expect(markdown).not.toContain('## Dependencies');
    });
  });

  describe('writeContextFile', () => {
    it('should create context file in .specflux directory', () => {
      const contextPath = writeContextFile(testDir, taskId);

      expect(contextPath).not.toBeNull();
      expect(fs.existsSync(contextPath!)).toBe(true);
      expect(contextPath).toContain('.specflux/context.md');
    });

    it('should write correct content to file', () => {
      writeContextFile(testDir, taskId);
      const content = fs.readFileSync(path.join(testDir, '.specflux', 'context.md'), 'utf-8');

      expect(content).toContain('Implement user authentication');
      expect(content).toContain('Context Test Project');
    });

    it('should return null for non-existent task', () => {
      const contextPath = writeContextFile(testDir, 99999);
      expect(contextPath).toBeNull();
    });
  });

  describe('readContextFile', () => {
    beforeAll(() => {
      writeContextFile(testDir, taskId);
    });

    it('should read existing context file', () => {
      const content = readContextFile(testDir);

      expect(content).not.toBeNull();
      expect(content).toContain('# Task Context');
    });

    it('should return null for missing context file', () => {
      const nonExistentDir = path.join(__dirname, '../../non-existent-dir');
      const content = readContextFile(nonExistentDir);
      expect(content).toBeNull();
    });
  });

  describe('deleteContextFile', () => {
    it('should delete existing context file', () => {
      // Write a file first
      writeContextFile(testDir, taskId);
      const contextPath = path.join(testDir, '.specflux', 'context.md');
      expect(fs.existsSync(contextPath)).toBe(true);

      // Delete it
      deleteContextFile(testDir);
      expect(fs.existsSync(contextPath)).toBe(false);
    });

    it('should not throw for missing context file', () => {
      expect(() => {
        deleteContextFile(path.join(__dirname, '../../non-existent-dir'));
      }).not.toThrow();
    });
  });
});
