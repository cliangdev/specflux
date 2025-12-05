import fs from 'fs';
import path from 'path';
import {
  initializeProjectStructure,
  initializeSpecfluxStructure,
  initializeClaudeDirectory,
  SPECFLUX_DIRS,
  CLAUDE_DIRS,
} from '../services/filesystem.service';

describe('FilesystemService', () => {
  const testBasePath = path.join(__dirname, '../../test-project-fs');

  beforeAll(() => {
    // Create test directory
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true, force: true });
    }
    fs.mkdirSync(testBasePath, { recursive: true });
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up .specflux directory between tests
    const specfluxPath = path.join(testBasePath, SPECFLUX_DIRS.ROOT);
    if (fs.existsSync(specfluxPath)) {
      fs.rmSync(specfluxPath, { recursive: true, force: true });
    }

    // Clean up .claude directory between tests
    const claudePath = path.join(testBasePath, CLAUDE_DIRS.ROOT);
    if (fs.existsSync(claudePath)) {
      fs.rmSync(claudePath, { recursive: true, force: true });
    }

    // Clean up CLAUDE.md file
    const claudeMdPath = path.join(testBasePath, 'CLAUDE.md');
    if (fs.existsSync(claudeMdPath)) {
      fs.unlinkSync(claudeMdPath);
    }
  });

  describe('initializeSpecfluxStructure', () => {
    it('should create all .specflux subdirectories', () => {
      initializeSpecfluxStructure(testBasePath);

      // Check all directories exist
      for (const dir of Object.values(SPECFLUX_DIRS)) {
        const fullPath = path.join(testBasePath, dir);
        expect(fs.existsSync(fullPath)).toBe(true);
        expect(fs.statSync(fullPath).isDirectory()).toBe(true);
      }
    });

    it('should create .gitkeep files in subdirectories', () => {
      initializeSpecfluxStructure(testBasePath);

      // Check .gitkeep files exist in subdirectories (not ROOT)
      const subdirs = Object.values(SPECFLUX_DIRS).slice(1);
      for (const dir of subdirs) {
        const gitkeepPath = path.join(testBasePath, dir, '.gitkeep');
        expect(fs.existsSync(gitkeepPath)).toBe(true);
      }
    });

    it('should not fail if directories already exist', () => {
      // Create structure twice - should not throw
      initializeSpecfluxStructure(testBasePath);
      expect(() => initializeSpecfluxStructure(testBasePath)).not.toThrow();
    });
  });

  describe('initializeProjectStructure', () => {
    it('should return success when initializing valid path', () => {
      const result = initializeProjectStructure(testBasePath);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify directories were created
      const rootPath = path.join(testBasePath, SPECFLUX_DIRS.ROOT);
      expect(fs.existsSync(rootPath)).toBe(true);
    });

    it('should return error for non-existent path', () => {
      const nonExistentPath = path.join(testBasePath, 'does-not-exist');
      const result = initializeProjectStructure(nonExistentPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should not throw even on filesystem errors', () => {
      // This test verifies the try/catch works - we pass a valid path
      // so it should succeed, but the function should never throw
      expect(() => initializeProjectStructure(testBasePath)).not.toThrow();
    });

    it('should succeed when .specflux already exists', () => {
      // Initialize once
      initializeProjectStructure(testBasePath);

      // Initialize again - should still succeed
      const result = initializeProjectStructure(testBasePath);
      expect(result.success).toBe(true);
    });
  });

  describe('initializeClaudeDirectory', () => {
    it('should create .claude directory structure', () => {
      const result = initializeClaudeDirectory(testBasePath, 'Test Project');

      expect(result.success).toBe(true);

      // Check directories exist
      for (const dir of Object.values(CLAUDE_DIRS)) {
        const fullPath = path.join(testBasePath, dir);
        expect(fs.existsSync(fullPath)).toBe(true);
        expect(fs.statSync(fullPath).isDirectory()).toBe(true);
      }
    });

    it('should create CLAUDE.md at project root', () => {
      initializeClaudeDirectory(testBasePath, 'Test Project');

      const claudeMdPath = path.join(testBasePath, 'CLAUDE.md');
      expect(fs.existsSync(claudeMdPath)).toBe(true);

      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      expect(content).toContain('Test Project');
      expect(content).toContain('/prd');
    });

    it('should create .mcp.json', () => {
      initializeClaudeDirectory(testBasePath, 'Test Project');

      const mcpPath = path.join(testBasePath, CLAUDE_DIRS.ROOT, '.mcp.json');
      expect(fs.existsSync(mcpPath)).toBe(true);

      const content = fs.readFileSync(mcpPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.mcpServers).toBeDefined();
    });

    it('should create all command templates', () => {
      initializeClaudeDirectory(testBasePath, 'Test Project');

      const commandNames = ['prd.md', 'epic.md', 'design.md', 'implement.md', 'task.md'];

      for (const name of commandNames) {
        const cmdPath = path.join(testBasePath, CLAUDE_DIRS.COMMANDS, name);
        expect(fs.existsSync(cmdPath)).toBe(true);
      }
    });

    it('should not overwrite existing files', () => {
      // Create CLAUDE.md with custom content
      const claudeMdPath = path.join(testBasePath, 'CLAUDE.md');
      fs.writeFileSync(claudeMdPath, 'Custom content');

      initializeClaudeDirectory(testBasePath, 'Test Project');

      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      expect(content).toBe('Custom content');
    });

    it('should return error for non-existent path', () => {
      const nonExistentPath = path.join(testBasePath, 'does-not-exist');
      const result = initializeClaudeDirectory(nonExistentPath, 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should succeed when .claude already exists', () => {
      // Initialize once
      initializeClaudeDirectory(testBasePath, 'Test Project');

      // Initialize again - should still succeed
      const result = initializeClaudeDirectory(testBasePath, 'Test Project');
      expect(result.success).toBe(true);
    });
  });
});
