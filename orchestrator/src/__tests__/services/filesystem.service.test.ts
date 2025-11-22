import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  initializeSpecfluxStructure,
  hasSpecfluxStructure,
  getSpecfluxPath,
  readMarkdownFile,
  writeMarkdownFile,
  listMarkdownFiles,
  deleteMarkdownFile,
  generateFilename,
  createPrdFile,
  listPrdFiles,
  createEpicFile,
  listEpicFiles,
  createTaskContextFile,
  getTaskContextFile,
  saveChainOutput,
  getChainOutput,
  getChainOutputsForTasks,
  SPECFLUX_DIRS,
  PrdFrontmatter,
  EpicFrontmatter,
  TaskContextFrontmatter,
} from '../../services/filesystem.service';

describe('Filesystem Service', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specflux-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('initializeSpecfluxStructure', () => {
    it('should create all required directories', () => {
      initializeSpecfluxStructure(tempDir);

      expect(fs.existsSync(path.join(tempDir, SPECFLUX_DIRS.ROOT))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, SPECFLUX_DIRS.PRDS))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, SPECFLUX_DIRS.EPICS))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, SPECFLUX_DIRS.TASKS))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, SPECFLUX_DIRS.CHAIN_OUTPUTS))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, SPECFLUX_DIRS.WORKTREES))).toBe(true);
    });

    it('should create .gitkeep files in subdirectories', () => {
      initializeSpecfluxStructure(tempDir);

      expect(fs.existsSync(path.join(tempDir, SPECFLUX_DIRS.PRDS, '.gitkeep'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, SPECFLUX_DIRS.EPICS, '.gitkeep'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, SPECFLUX_DIRS.TASKS, '.gitkeep'))).toBe(true);
    });

    it('should be idempotent', () => {
      initializeSpecfluxStructure(tempDir);
      initializeSpecfluxStructure(tempDir);

      expect(fs.existsSync(path.join(tempDir, SPECFLUX_DIRS.ROOT))).toBe(true);
    });
  });

  describe('hasSpecfluxStructure', () => {
    it('should return false for empty directory', () => {
      expect(hasSpecfluxStructure(tempDir)).toBe(false);
    });

    it('should return true after initialization', () => {
      initializeSpecfluxStructure(tempDir);
      expect(hasSpecfluxStructure(tempDir)).toBe(true);
    });
  });

  describe('getSpecfluxPath', () => {
    it('should return correct paths', () => {
      expect(getSpecfluxPath(tempDir, 'ROOT')).toBe(path.join(tempDir, '.specflux'));
      expect(getSpecfluxPath(tempDir, 'PRDS')).toBe(path.join(tempDir, '.specflux/prds'));
      expect(getSpecfluxPath(tempDir, 'EPICS')).toBe(path.join(tempDir, '.specflux/epics'));
    });
  });

  describe('generateFilename', () => {
    it('should convert title to safe filename', () => {
      expect(generateFilename('User Authentication')).toBe('user-authentication.md');
      expect(generateFilename('Build REST API v2')).toBe('build-rest-api-v2.md');
      expect(generateFilename('  Whitespace  ')).toBe('whitespace.md');
    });

    it('should handle special characters', () => {
      expect(generateFilename('Test: Feature #1')).toBe('test-feature-1.md');
      expect(generateFilename('User/Auth')).toBe('user-auth.md');
    });

    it('should support custom extensions', () => {
      expect(generateFilename('Config', '.yaml')).toBe('config.yaml');
    });
  });

  describe('Markdown File Operations', () => {
    describe('writeMarkdownFile and readMarkdownFile', () => {
      it('should write and read markdown with frontmatter', () => {
        const filePath = path.join(tempDir, 'test.md');
        const frontmatter = { title: 'Test', status: 'draft' };
        const content = '# Test Content\n\nThis is a test.';

        writeMarkdownFile(filePath, frontmatter, content);

        const result = readMarkdownFile(filePath);

        expect(result).not.toBeNull();
        expect(result!.frontmatter).toEqual(frontmatter);
        expect(result!.content).toBe(content);
        expect(result!.path).toBe(filePath);
      });

      it('should create parent directories if needed', () => {
        const filePath = path.join(tempDir, 'nested', 'dir', 'test.md');

        writeMarkdownFile(filePath, { title: 'Test' }, 'Content');

        expect(fs.existsSync(filePath)).toBe(true);
      });

      it('should return null for non-existent file', () => {
        const result = readMarkdownFile(path.join(tempDir, 'nonexistent.md'));
        expect(result).toBeNull();
      });
    });

    describe('listMarkdownFiles', () => {
      it('should list all markdown files in directory', () => {
        initializeSpecfluxStructure(tempDir);
        const prdsPath = path.join(tempDir, SPECFLUX_DIRS.PRDS);

        writeMarkdownFile(path.join(prdsPath, 'file1.md'), {}, 'Content 1');
        writeMarkdownFile(path.join(prdsPath, 'file2.md'), {}, 'Content 2');
        fs.writeFileSync(path.join(prdsPath, 'not-md.txt'), 'Not markdown');

        const files = listMarkdownFiles(prdsPath);

        expect(files).toHaveLength(2);
        expect(files.some((f) => f.endsWith('file1.md'))).toBe(true);
        expect(files.some((f) => f.endsWith('file2.md'))).toBe(true);
      });

      it('should return empty array for non-existent directory', () => {
        const files = listMarkdownFiles(path.join(tempDir, 'nonexistent'));
        expect(files).toEqual([]);
      });
    });

    describe('deleteMarkdownFile', () => {
      it('should delete existing file', () => {
        const filePath = path.join(tempDir, 'to-delete.md');
        writeMarkdownFile(filePath, {}, 'Content');

        const result = deleteMarkdownFile(filePath);

        expect(result).toBe(true);
        expect(fs.existsSync(filePath)).toBe(false);
      });

      it('should return false for non-existent file', () => {
        const result = deleteMarkdownFile(path.join(tempDir, 'nonexistent.md'));
        expect(result).toBe(false);
      });
    });
  });

  describe('PRD File Operations', () => {
    beforeEach(() => {
      initializeSpecfluxStructure(tempDir);
    });

    describe('createPrdFile', () => {
      it('should create a PRD file with correct frontmatter', () => {
        const result = createPrdFile(
          tempDir,
          'User Authentication',
          '# Overview\n\nAuthentication PRD',
          'dev@test.com'
        );

        expect(result.frontmatter.title).toBe('User Authentication');
        expect(result.frontmatter.status).toBe('draft');
        expect(result.frontmatter.author).toBe('dev@test.com');
        expect(result.frontmatter.created_at).toBeDefined();
        expect(result.frontmatter.updated_at).toBeDefined();
        expect(result.content).toBe('# Overview\n\nAuthentication PRD');
        expect(fs.existsSync(result.path)).toBe(true);
      });

      it('should generate correct filename', () => {
        const result = createPrdFile(tempDir, 'API Design Document', 'Content');

        expect(result.path).toContain('api-design-document.md');
      });
    });

    describe('listPrdFiles', () => {
      it('should list all PRD files', () => {
        createPrdFile(tempDir, 'PRD 1', 'Content 1');
        createPrdFile(tempDir, 'PRD 2', 'Content 2');

        const prds = listPrdFiles(tempDir);

        expect(prds).toHaveLength(2);
        expect(prds.some((p) => p.frontmatter.title === 'PRD 1')).toBe(true);
        expect(prds.some((p) => p.frontmatter.title === 'PRD 2')).toBe(true);
      });

      it('should return empty array if no PRDs', () => {
        const prds = listPrdFiles(tempDir);
        expect(prds).toEqual([]);
      });
    });
  });

  describe('Epic File Operations', () => {
    beforeEach(() => {
      initializeSpecfluxStructure(tempDir);
    });

    describe('createEpicFile', () => {
      it('should create an Epic file with correct frontmatter', () => {
        const result = createEpicFile(
          tempDir,
          'User Auth Epic',
          '# Tasks\n\n- Login\n- Logout',
          'prds/user-auth.md',
          'dev@test.com'
        );

        expect(result.frontmatter.title).toBe('User Auth Epic');
        expect(result.frontmatter.status).toBe('planning');
        expect(result.frontmatter.prd_path).toBe('prds/user-auth.md');
        expect(result.frontmatter.author).toBe('dev@test.com');
        expect(result.content).toBe('# Tasks\n\n- Login\n- Logout');
      });
    });

    describe('listEpicFiles', () => {
      it('should list all Epic files', () => {
        createEpicFile(tempDir, 'Epic 1', 'Content 1');
        createEpicFile(tempDir, 'Epic 2', 'Content 2');

        const epics = listEpicFiles(tempDir);

        expect(epics).toHaveLength(2);
      });
    });
  });

  describe('Task Context File Operations', () => {
    beforeEach(() => {
      initializeSpecfluxStructure(tempDir);
    });

    describe('createTaskContextFile', () => {
      it('should create task context with dependencies and chain inputs', () => {
        const result = createTaskContextFile(
          tempDir,
          42,
          'Implement JWT',
          'Create JWT service with signing and verification',
          [40, 41],
          ['chain-outputs/task-40.md', 'chain-outputs/task-41.md']
        );

        expect(result.frontmatter.task_id).toBe(42);
        expect(result.frontmatter.title).toBe('Implement JWT');
        expect(result.frontmatter.dependencies).toEqual([40, 41]);
        expect(result.frontmatter.chain_inputs).toEqual([
          'chain-outputs/task-40.md',
          'chain-outputs/task-41.md',
        ]);
        expect(result.content).toBe('Create JWT service with signing and verification');
        expect(result.path).toContain('task-42.md');
      });
    });

    describe('getTaskContextFile', () => {
      it('should retrieve task context by ID', () => {
        createTaskContextFile(tempDir, 100, 'Test Task', 'Description');

        const result = getTaskContextFile(tempDir, 100);

        expect(result).not.toBeNull();
        expect(result!.frontmatter.task_id).toBe(100);
        expect(result!.frontmatter.title).toBe('Test Task');
      });

      it('should return null for non-existent task', () => {
        const result = getTaskContextFile(tempDir, 999);
        expect(result).toBeNull();
      });
    });
  });

  describe('Chain Output Operations', () => {
    beforeEach(() => {
      initializeSpecfluxStructure(tempDir);
    });

    describe('saveChainOutput', () => {
      it('should save chain output for a task', () => {
        const summary =
          '## Summary\n\nImplemented JWT service with:\n- Sign method\n- Verify method';

        const filePath = saveChainOutput(tempDir, 42, summary);

        expect(fs.existsSync(filePath)).toBe(true);
        expect(filePath).toContain('task-42.md');
      });
    });

    describe('getChainOutput', () => {
      it('should retrieve chain output by task ID', () => {
        saveChainOutput(tempDir, 42, 'Chain output content');

        const result = getChainOutput(tempDir, 42);

        expect(result).not.toBeNull();
        expect(result!.frontmatter.task_id).toBe(42);
        expect(result!.content).toBe('Chain output content');
      });

      it('should return null for non-existent chain output', () => {
        const result = getChainOutput(tempDir, 999);
        expect(result).toBeNull();
      });
    });

    describe('getChainOutputsForTasks', () => {
      it('should retrieve multiple chain outputs', () => {
        saveChainOutput(tempDir, 1, 'Output 1');
        saveChainOutput(tempDir, 2, 'Output 2');
        saveChainOutput(tempDir, 3, 'Output 3');

        const outputs = getChainOutputsForTasks(tempDir, [1, 2, 3]);

        expect(outputs).toHaveLength(3);
        expect(outputs.map((o) => o.frontmatter.task_id)).toEqual([1, 2, 3]);
      });

      it('should skip non-existent chain outputs', () => {
        saveChainOutput(tempDir, 1, 'Output 1');

        const outputs = getChainOutputsForTasks(tempDir, [1, 999, 2]);

        expect(outputs).toHaveLength(1);
        expect(outputs[0]!.frontmatter.task_id).toBe(1);
      });
    });
  });

  describe('Integration: Full Workflow', () => {
    it('should support complete PRD -> Epic -> Task -> Chain Output workflow', () => {
      // Initialize project structure
      initializeSpecfluxStructure(tempDir);
      expect(hasSpecfluxStructure(tempDir)).toBe(true);

      // Create PRD
      const prd = createPrdFile(
        tempDir,
        'User Authentication',
        '# User Auth PRD\n\n## Goals\n- Login\n- Logout\n- Sessions',
        'product@company.com'
      );
      expect(prd.frontmatter.status).toBe('draft');

      // Create Epic linked to PRD
      const epic = createEpicFile(
        tempDir,
        'Auth Implementation',
        '# Epic\n\n## Tasks\n- JWT Service\n- Login Form',
        prd.path,
        'dev@company.com'
      );
      expect(epic.frontmatter.prd_path).toBe(prd.path);

      // Create task context
      const task = createTaskContextFile(
        tempDir,
        1,
        'JWT Service',
        'Implement JWT signing and verification',
        [],
        []
      );
      expect(task.frontmatter.task_id).toBe(1);

      // Save chain output after task completion
      const chainPath = saveChainOutput(
        tempDir,
        1,
        '## JWT Service Implemented\n\n- verifyToken(token)\n- signToken(payload)'
      );

      // Create dependent task with chain input
      const dependentTask = createTaskContextFile(
        tempDir,
        2,
        'Login Endpoint',
        'Create login API endpoint',
        [1],
        [chainPath]
      );
      expect(dependentTask.frontmatter.dependencies).toEqual([1]);
      expect(dependentTask.frontmatter.chain_inputs).toContain(chainPath);

      // Retrieve chain outputs for dependent task
      const chainOutputs = getChainOutputsForTasks(tempDir, [1]);
      expect(chainOutputs).toHaveLength(1);
      expect(chainOutputs[0]!.content).toContain('verifyToken');
    });
  });
});
