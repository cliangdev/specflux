import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  initRepo,
  isGitRepo,
  getStatus,
  addFiles,
  addAll,
  commit,
  getCurrentBranch,
  getBranches,
  createBranch,
  checkout,
  getLog,
  getDiff,
  configureRepo,
  hasRemote,
  addRemote,
  getRemoteUrl,
  autoCommitSpecflux,
} from '../../services/git.service';
import { initializeSpecfluxStructure, writeMarkdownFile } from '../../services/filesystem.service';

describe('Git Service', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specflux-git-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('initRepo', () => {
    it('should initialize a git repository', async () => {
      await initRepo(tempDir);

      const gitDir = path.join(tempDir, '.git');
      expect(fs.existsSync(gitDir)).toBe(true);
    });
  });

  describe('isGitRepo', () => {
    it('should return false for non-git directory', async () => {
      const result = await isGitRepo(tempDir);
      expect(result).toBe(false);
    });

    it('should return true for git directory', async () => {
      await initRepo(tempDir);
      const result = await isGitRepo(tempDir);
      expect(result).toBe(true);
    });
  });

  describe('getStatus', () => {
    beforeEach(async () => {
      await initRepo(tempDir);
      await configureRepo(tempDir, 'Test User', 'test@example.com');
    });

    it('should return clean status for empty repo', async () => {
      // Need at least one commit for status to work properly
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test');
      await addAll(tempDir);
      await commit(tempDir, 'Initial commit');

      const status = await getStatus(tempDir);

      expect(status.isClean).toBe(true);
      expect(status.staged).toEqual([]);
      expect(status.modified).toEqual([]);
      expect(status.untracked).toEqual([]);
    });

    it('should detect untracked files', async () => {
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test');
      await addAll(tempDir);
      await commit(tempDir, 'Initial commit');

      fs.writeFileSync(path.join(tempDir, 'new-file.txt'), 'content');

      const status = await getStatus(tempDir);

      expect(status.isClean).toBe(false);
      expect(status.untracked).toContain('new-file.txt');
    });

    it('should detect modified files', async () => {
      fs.writeFileSync(path.join(tempDir, 'file.txt'), 'original');
      await addAll(tempDir);
      await commit(tempDir, 'Initial commit');

      fs.writeFileSync(path.join(tempDir, 'file.txt'), 'modified');

      const status = await getStatus(tempDir);

      expect(status.isClean).toBe(false);
      expect(status.modified).toContain('file.txt');
    });

    it('should detect staged files', async () => {
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test');
      await addAll(tempDir);
      await commit(tempDir, 'Initial commit');

      fs.writeFileSync(path.join(tempDir, 'staged.txt'), 'content');
      await addFiles(tempDir, 'staged.txt');

      const status = await getStatus(tempDir);

      expect(status.staged).toContain('staged.txt');
    });
  });

  describe('addFiles and commit', () => {
    beforeEach(async () => {
      await initRepo(tempDir);
      await configureRepo(tempDir, 'Test User', 'test@example.com');
    });

    it('should stage and commit files', async () => {
      fs.writeFileSync(path.join(tempDir, 'file.txt'), 'content');

      await addFiles(tempDir, 'file.txt');
      const result = await commit(tempDir, 'Test commit');

      expect(result.commit).toBeDefined();
      expect(['main', 'master']).toContain(result.branch);
      expect(result.summary.changes).toBeGreaterThan(0);
    });

    it('should stage all files with addAll', async () => {
      fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(tempDir, 'file2.txt'), 'content2');

      await addAll(tempDir);
      const result = await commit(tempDir, 'Add all files');

      expect(result.summary.changes).toBe(2);
    });
  });

  describe('branches', () => {
    beforeEach(async () => {
      await initRepo(tempDir);
      await configureRepo(tempDir, 'Test User', 'test@example.com');
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test');
      await addAll(tempDir);
      await commit(tempDir, 'Initial commit');
    });

    it('should get current branch', async () => {
      const branch = await getCurrentBranch(tempDir);
      expect(['main', 'master']).toContain(branch);
    });

    it('should create and checkout new branch', async () => {
      await createBranch(tempDir, 'feature-test');

      const branch = await getCurrentBranch(tempDir);
      expect(branch).toBe('feature-test');
    });

    it('should switch branches', async () => {
      const defaultBranch = await getCurrentBranch(tempDir);
      await createBranch(tempDir, 'feature-test');
      await checkout(tempDir, defaultBranch!);

      const branch = await getCurrentBranch(tempDir);
      expect(branch).toBe(defaultBranch);
    });

    it('should list all branches', async () => {
      const defaultBranch = await getCurrentBranch(tempDir);
      await createBranch(tempDir, 'feature-a');
      await checkout(tempDir, defaultBranch!);
      await createBranch(tempDir, 'feature-b');

      const branches = await getBranches(tempDir);

      expect(branches.all).toContain(defaultBranch);
      expect(branches.all).toContain('feature-a');
      expect(branches.all).toContain('feature-b');
      expect(branches.current).toBe('feature-b');
    });
  });

  describe('getLog', () => {
    beforeEach(async () => {
      await initRepo(tempDir);
      await configureRepo(tempDir, 'Test User', 'test@example.com');
    });

    it('should return commit history', async () => {
      fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'content1');
      await addAll(tempDir);
      await commit(tempDir, 'First commit');

      fs.writeFileSync(path.join(tempDir, 'file2.txt'), 'content2');
      await addAll(tempDir);
      await commit(tempDir, 'Second commit');

      const log = await getLog(tempDir);

      expect(log).toHaveLength(2);
      expect(log[0]!.message).toBe('Second commit');
      expect(log[1]!.message).toBe('First commit');
      expect(log[0]!.author).toBe('Test User');
    });

    it('should limit log entries', async () => {
      for (let i = 0; i < 5; i++) {
        fs.writeFileSync(path.join(tempDir, `file${i}.txt`), `content${i}`);
        await addAll(tempDir);
        await commit(tempDir, `Commit ${i}`);
      }

      const log = await getLog(tempDir, 3);

      expect(log).toHaveLength(3);
    });
  });

  describe('getDiff', () => {
    beforeEach(async () => {
      await initRepo(tempDir);
      await configureRepo(tempDir, 'Test User', 'test@example.com');
      fs.writeFileSync(path.join(tempDir, 'file.txt'), 'original');
      await addAll(tempDir);
      await commit(tempDir, 'Initial commit');
    });

    it('should return diff of unstaged changes', async () => {
      fs.writeFileSync(path.join(tempDir, 'file.txt'), 'modified');

      const diff = await getDiff(tempDir);

      expect(diff).toContain('-original');
      expect(diff).toContain('+modified');
    });

    it('should return diff of staged changes', async () => {
      fs.writeFileSync(path.join(tempDir, 'file.txt'), 'staged changes');
      await addAll(tempDir);

      const diff = await getDiff(tempDir, true);

      expect(diff).toContain('-original');
      expect(diff).toContain('+staged changes');
    });
  });

  describe('remotes', () => {
    beforeEach(async () => {
      await initRepo(tempDir);
    });

    it('should return false when no remote exists', async () => {
      const result = await hasRemote(tempDir);
      expect(result).toBe(false);
    });

    it('should add and detect remote', async () => {
      await addRemote(tempDir, 'origin', 'https://github.com/test/repo.git');

      const result = await hasRemote(tempDir);
      expect(result).toBe(true);
    });

    it('should get remote URL', async () => {
      await addRemote(tempDir, 'origin', 'https://github.com/test/repo.git');

      const url = await getRemoteUrl(tempDir);
      expect(url).toBe('https://github.com/test/repo.git');
    });

    it('should return null for non-existent remote', async () => {
      const url = await getRemoteUrl(tempDir, 'nonexistent');
      expect(url).toBeNull();
    });
  });

  describe('autoCommitSpecflux', () => {
    beforeEach(async () => {
      await initRepo(tempDir);
      await configureRepo(tempDir, 'Test User', 'test@example.com');
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test');
      initializeSpecfluxStructure(tempDir);
      await addAll(tempDir);
      await commit(tempDir, 'Initial commit with specflux structure');
    });

    it('should return null when no specflux changes', async () => {
      const result = await autoCommitSpecflux(tempDir);
      expect(result).toBeNull();
    });

    it('should auto-commit specflux changes', async () => {
      const prdPath = path.join(tempDir, '.specflux', 'prds', 'test.md');
      writeMarkdownFile(prdPath, { title: 'Test PRD' }, '# Test PRD');

      const result = await autoCommitSpecflux(tempDir);

      expect(result).not.toBeNull();
      expect(result!.commit).toBeDefined();
      expect(result!.summary.changes).toBeGreaterThan(0);

      const status = await getStatus(tempDir);
      expect(status.isClean).toBe(true);
    });

    it('should use custom commit message', async () => {
      const prdPath = path.join(tempDir, '.specflux', 'prds', 'test.md');
      writeMarkdownFile(prdPath, { title: 'Test' }, 'Content');

      await autoCommitSpecflux(tempDir, 'Custom message');

      const log = await getLog(tempDir, 1);
      expect(log[0]!.message).toBe('Custom message');
    });

    it('should only commit specflux changes, not other files', async () => {
      // Create both specflux and non-specflux files
      const prdPath = path.join(tempDir, '.specflux', 'prds', 'test.md');
      writeMarkdownFile(prdPath, { title: 'Test' }, 'Content');
      fs.writeFileSync(path.join(tempDir, 'other.txt'), 'other content');

      await autoCommitSpecflux(tempDir);

      const status = await getStatus(tempDir);
      // other.txt should still be untracked
      expect(status.untracked).toContain('other.txt');
    });
  });
});
