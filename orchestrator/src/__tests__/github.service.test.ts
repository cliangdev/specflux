import {
  parseGitRemote,
  getGitHubToken,
  hasGitHubToken,
  getManualPRUrl,
  type RepoInfo,
} from '../services/github.service';

describe('GitHub Service', () => {
  describe('parseGitRemote', () => {
    it('should parse SSH format remote URL', () => {
      const result = parseGitRemote('git@github.com:owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse SSH format without .git extension', () => {
      const result = parseGitRemote('git@github.com:myorg/myrepo');
      expect(result).toEqual({ owner: 'myorg', repo: 'myrepo' });
    });

    it('should parse HTTPS format remote URL', () => {
      const result = parseGitRemote('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse HTTPS format without .git extension', () => {
      const result = parseGitRemote('https://github.com/myorg/myrepo');
      expect(result).toEqual({ owner: 'myorg', repo: 'myrepo' });
    });

    it('should handle owner with hyphens', () => {
      const result = parseGitRemote('git@github.com:my-org/my-repo.git');
      expect(result).toEqual({ owner: 'my-org', repo: 'my-repo' });
    });

    it('should handle owner with underscores', () => {
      const result = parseGitRemote('git@github.com:my_org/my_repo.git');
      expect(result).toEqual({ owner: 'my_org', repo: 'my_repo' });
    });

    it('should return null for invalid URL', () => {
      const result = parseGitRemote('not-a-valid-url');
      expect(result).toBeNull();
    });

    it('should return null for non-GitHub URL', () => {
      const result = parseGitRemote('git@gitlab.com:owner/repo.git');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseGitRemote('');
      expect(result).toBeNull();
    });
  });

  describe('getGitHubToken', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset env before each test
      process.env = { ...originalEnv };
      delete process.env['GITHUB_PERSONAL_ACCESS_TOKEN'];
      delete process.env['GITHUB_TOKEN'];
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return GITHUB_PERSONAL_ACCESS_TOKEN if set', () => {
      process.env['GITHUB_PERSONAL_ACCESS_TOKEN'] = 'pat-token';
      const token = getGitHubToken();
      expect(token).toBe('pat-token');
    });

    it('should fallback to GITHUB_TOKEN if GITHUB_PERSONAL_ACCESS_TOKEN not set', () => {
      process.env['GITHUB_TOKEN'] = 'gh-token';
      const token = getGitHubToken();
      expect(token).toBe('gh-token');
    });

    it('should prefer GITHUB_PERSONAL_ACCESS_TOKEN over GITHUB_TOKEN', () => {
      process.env['GITHUB_PERSONAL_ACCESS_TOKEN'] = 'pat-token';
      process.env['GITHUB_TOKEN'] = 'gh-token';
      const token = getGitHubToken();
      expect(token).toBe('pat-token');
    });

    it('should return null if neither token is set', () => {
      const token = getGitHubToken();
      expect(token).toBeNull();
    });
  });

  describe('hasGitHubToken', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env['GITHUB_PERSONAL_ACCESS_TOKEN'];
      delete process.env['GITHUB_TOKEN'];
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return true if GITHUB_PERSONAL_ACCESS_TOKEN is set', () => {
      process.env['GITHUB_PERSONAL_ACCESS_TOKEN'] = 'token';
      expect(hasGitHubToken()).toBe(true);
    });

    it('should return true if GITHUB_TOKEN is set', () => {
      process.env['GITHUB_TOKEN'] = 'token';
      expect(hasGitHubToken()).toBe(true);
    });

    it('should return false if no token is set', () => {
      expect(hasGitHubToken()).toBe(false);
    });
  });

  describe('getManualPRUrl', () => {
    it('should generate correct compare URL', () => {
      const repoInfo: RepoInfo = { owner: 'myorg', repo: 'myrepo' };
      const url = getManualPRUrl(repoInfo, 'feature-branch', 'main');
      expect(url).toBe('https://github.com/myorg/myrepo/compare/main...feature-branch?expand=1');
    });

    it('should handle different base branches', () => {
      const repoInfo: RepoInfo = { owner: 'owner', repo: 'repo' };
      const url = getManualPRUrl(repoInfo, 'my-feature', 'develop');
      expect(url).toBe('https://github.com/owner/repo/compare/develop...my-feature?expand=1');
    });

    it('should handle branch names with slashes', () => {
      const repoInfo: RepoInfo = { owner: 'owner', repo: 'repo' };
      const url = getManualPRUrl(repoInfo, 'feature/new-thing', 'main');
      expect(url).toBe('https://github.com/owner/repo/compare/main...feature/new-thing?expand=1');
    });
  });
});
