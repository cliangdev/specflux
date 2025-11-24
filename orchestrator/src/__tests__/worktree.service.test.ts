import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  createWorktree,
  removeWorktree,
  getWorktree,
  hasWorktree,
  generateBranchName,
  getWorktreeBaseDir,
  clearWorktreeTracking,
} from '../services/worktree.service';

describe('WorktreeService', () => {
  const testRepoPath = path.join(__dirname, '../../test-repo-worktree');

  beforeAll(() => {
    // Create a temporary git repository for testing
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
    fs.mkdirSync(testRepoPath, { recursive: true });
    execSync('git init', { cwd: testRepoPath, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: testRepoPath, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testRepoPath, stdio: 'pipe' });
    // Create initial commit (required for worktrees)
    fs.writeFileSync(path.join(testRepoPath, 'README.md'), '# Test Repo');
    execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: testRepoPath, stdio: 'pipe' });
    // Ensure we have a 'main' branch (required by createWorktree)
    execSync('git branch -M main', { cwd: testRepoPath, stdio: 'pipe' });
  });

  afterAll(() => {
    // Clean up test repository
    if (fs.existsSync(testRepoPath)) {
      // Remove all worktrees first
      try {
        execSync('git worktree prune', { cwd: testRepoPath, stdio: 'pipe' });
      } catch {
        // Ignore errors
      }
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clear tracking between tests
    clearWorktreeTracking();
  });

  afterEach(() => {
    // Clean up any worktrees created during tests
    const worktreeBase = getWorktreeBaseDir(testRepoPath);
    if (fs.existsSync(worktreeBase)) {
      try {
        execSync('git worktree prune', { cwd: testRepoPath, stdio: 'pipe' });
      } catch {
        // Ignore errors
      }
      fs.rmSync(worktreeBase, { recursive: true, force: true });
    }
    clearWorktreeTracking();
  });

  describe('generateBranchName', () => {
    it('should generate a valid branch name from task title', () => {
      const branchName = generateBranchName(123, 'Add user authentication');
      expect(branchName).toBe('task/123-add-user-authentication');
    });

    it('should handle special characters', () => {
      const branchName = generateBranchName(456, 'Fix bug #123: API errors!');
      expect(branchName).toBe('task/456-fix-bug-123-api-errors');
    });

    it('should truncate long titles', () => {
      const longTitle =
        'This is a very long task title that should be truncated to a reasonable length';
      const branchName = generateBranchName(789, longTitle);
      expect(branchName.length).toBeLessThanOrEqual(60);
      expect(branchName.startsWith('task/789-')).toBe(true);
    });
  });

  describe('createWorktree', () => {
    it('should create a worktree with correct branch name', () => {
      const branchName = 'task/1-test-task';
      const worktree = createWorktree(1, testRepoPath, branchName);

      expect(worktree.taskId).toBe(1);
      expect(worktree.branch).toBe(branchName);
      expect(fs.existsSync(worktree.path)).toBe(true);
    });

    it('should track worktree correctly', () => {
      const branchName = 'task/2-another-task';
      createWorktree(2, testRepoPath, branchName);

      expect(hasWorktree(2)).toBe(true);
      expect(hasWorktree(999)).toBe(false);
    });

    it('should fail for duplicate worktree creation', () => {
      const branchName = 'task/3-duplicate-task';
      createWorktree(3, testRepoPath, branchName);

      expect(() => {
        createWorktree(3, testRepoPath, 'task/3-different-branch');
      }).toThrow('Worktree already exists for task 3');
    });

    it('should fail for non-existent project path', () => {
      expect(() => {
        createWorktree(4, '/non/existent/path', 'task/4-test');
      }).toThrow('Project path does not exist');
    });

    it('should fail for non-git directory', () => {
      const nonGitPath = path.join(__dirname, '../../test-non-git');
      fs.mkdirSync(nonGitPath, { recursive: true });

      try {
        expect(() => {
          createWorktree(5, nonGitPath, 'task/5-test');
        }).toThrow('not a git repository');
      } finally {
        fs.rmSync(nonGitPath, { recursive: true, force: true });
      }
    });
  });

  describe('removeWorktree', () => {
    it('should remove worktree and clean up tracking', () => {
      const branchName = 'task/10-remove-test';
      const worktree = createWorktree(10, testRepoPath, branchName);
      const worktreePath = worktree.path;

      expect(fs.existsSync(worktreePath)).toBe(true);
      expect(hasWorktree(10)).toBe(true);

      removeWorktree(10, testRepoPath);

      expect(hasWorktree(10)).toBe(false);
      expect(fs.existsSync(worktreePath)).toBe(false);
    });

    it('should not throw for non-existent worktree', () => {
      expect(() => {
        removeWorktree(999, testRepoPath);
      }).not.toThrow();
    });
  });

  describe('getWorktree', () => {
    it('should return worktree info for existing task', () => {
      const branchName = 'task/20-get-test';
      createWorktree(20, testRepoPath, branchName);

      const worktree = getWorktree(20, testRepoPath);
      expect(worktree).not.toBeNull();
      expect(worktree?.taskId).toBe(20);
      expect(worktree?.branch).toBe(branchName);
    });

    it('should return null for non-existent task', () => {
      const worktree = getWorktree(999, testRepoPath);
      expect(worktree).toBeNull();
    });
  });

  describe('getWorktreeBaseDir', () => {
    it('should return correct base directory path', () => {
      const baseDir = getWorktreeBaseDir('/some/project/path');
      expect(baseDir).toBe('/some/project/path/.specflux/worktrees');
    });
  });
});
