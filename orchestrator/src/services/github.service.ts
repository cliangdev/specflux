/**
 * GitHub Service
 *
 * Provides GitHub API operations using REST API.
 * Uses GITHUB_PERSONAL_ACCESS_TOKEN from environment.
 * Falls back gracefully if token is not available.
 */

import { execSync } from 'child_process';

export interface GitHubPRInput {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string; // source branch
  base: string; // target branch
}

export interface GitHubPRResult {
  success: boolean;
  prNumber: number | null;
  prUrl: string | null;
  message: string;
  method: 'api' | 'cli' | 'manual';
}

export interface RepoInfo {
  owner: string;
  repo: string;
}

/**
 * Parse owner and repo from a git remote URL
 * Supports:
 *   - git@github.com:owner/repo.git (standard SSH)
 *   - https://github.com/owner/repo.git (HTTPS)
 *   - github.com-alias:owner/repo.git (custom SSH host alias from ~/.ssh/config)
 */
export function parseGitRemote(remoteUrl: string): RepoInfo | null {
  // Standard SSH format: git@github.com:owner/repo.git
  const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (sshMatch?.[1] && sshMatch[2]) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  // HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = remoteUrl.match(/https:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (httpsMatch?.[1] && httpsMatch[2]) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // Custom SSH host alias format: github.com-alias:owner/repo.git or alias:owner/repo.git
  // This handles SSH config aliases like "github.com-cliangdev" that map to github.com
  const aliasMatch = remoteUrl.match(/^[^@:/]+:([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (aliasMatch?.[1] && aliasMatch[2]) {
    return { owner: aliasMatch[1], repo: aliasMatch[2] };
  }

  return null;
}

/**
 * Get GitHub token from environment
 */
export function getGitHubToken(): string | null {
  return process.env['GITHUB_PERSONAL_ACCESS_TOKEN'] ?? process.env['GITHUB_TOKEN'] ?? null;
}

/**
 * Check if GitHub token is available
 */
export function hasGitHubToken(): boolean {
  return getGitHubToken() !== null;
}

/**
 * Get repo info from a git working directory
 */
export function getRepoInfoFromPath(workingDir: string): RepoInfo | null {
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      cwd: workingDir,
      encoding: 'utf-8',
    }).trim();

    return parseGitRemote(remoteUrl);
  } catch {
    return null;
  }
}

/**
 * Create a pull request using GitHub REST API
 */
export async function createPullRequestAPI(input: GitHubPRInput): Promise<GitHubPRResult> {
  const token = getGitHubToken();

  if (!token) {
    return {
      success: false,
      prNumber: null,
      prUrl: null,
      message:
        'GitHub token not configured. Set GITHUB_PERSONAL_ACCESS_TOKEN environment variable.',
      method: 'api',
    };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${input.owner}/${input.repo}/pulls`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: input.title,
          body: input.body,
          head: input.head,
          base: input.base,
        }),
      }
    );

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(error.message ?? `HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      number: number;
      html_url: string;
    };

    return {
      success: true,
      prNumber: data.number,
      prUrl: data.html_url,
      message: `Created PR #${data.number}`,
      method: 'api',
    };
  } catch (error) {
    return {
      success: false,
      prNumber: null,
      prUrl: null,
      message: `GitHub API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      method: 'api',
    };
  }
}

/**
 * Create a pull request using gh CLI (fallback)
 */
export function createPullRequestCLI(
  workingDir: string,
  input: Omit<GitHubPRInput, 'owner' | 'repo'>
): GitHubPRResult {
  try {
    // Check if gh CLI is available
    execSync('which gh', { stdio: 'pipe' });

    // Escape single quotes in title and body for shell
    const escapedTitle = input.title.replace(/'/g, "'\\''");
    const escapedBody = input.body.replace(/'/g, "'\\''");

    const cmd = `gh pr create --title '${escapedTitle}' --body '${escapedBody}' --base ${input.base} --head ${input.head}`;
    console.log(`[GitHub] Creating PR with gh CLI: ${cmd.substring(0, 100)}...`);

    const prOutput = execSync(cmd, {
      cwd: workingDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    console.log(`[GitHub] gh CLI output: ${prOutput}`);

    // Parse PR URL from output
    const prUrl = prOutput;
    const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
    const prNumber = prNumberMatch?.[1] ? parseInt(prNumberMatch[1], 10) : null;

    return {
      success: true,
      prNumber,
      prUrl,
      message: `Created PR #${prNumber}`,
      method: 'cli',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[GitHub] gh CLI error: ${errorMessage}`);
    return {
      success: false,
      prNumber: null,
      prUrl: null,
      message: `gh CLI error: ${errorMessage}`,
      method: 'cli',
    };
  }
}

/**
 * Generate a manual PR URL for the user to create a PR manually
 */
export function getManualPRUrl(repoInfo: RepoInfo, head: string, base: string): string {
  return `https://github.com/${repoInfo.owner}/${repoInfo.repo}/compare/${base}...${head}?expand=1`;
}

/**
 * Create a pull request with fallback chain: API -> CLI -> Manual URL
 */
export async function createPullRequest(
  workingDir: string,
  options: {
    title: string;
    body: string;
    head: string;
    base: string;
  }
): Promise<GitHubPRResult> {
  // Get repo info
  const repoInfo = getRepoInfoFromPath(workingDir);
  if (!repoInfo) {
    return {
      success: false,
      prNumber: null,
      prUrl: null,
      message: 'Could not determine GitHub repository from git remote',
      method: 'api',
    };
  }

  // Try API first (if token available)
  if (hasGitHubToken()) {
    console.log(`[GitHub] Attempting PR creation via API for ${repoInfo.owner}/${repoInfo.repo}`);
    const apiResult = await createPullRequestAPI({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      ...options,
    });

    if (apiResult.success) {
      console.log(`[GitHub] PR created via API: ${apiResult.prUrl}`);
      return apiResult;
    }

    // Log API failure but continue to fallback
    console.warn(`[GitHub] API PR creation failed: ${apiResult.message}`);
  } else {
    console.log('[GitHub] No GitHub token, skipping API method');
  }

  // Try gh CLI as fallback
  const cliResult = createPullRequestCLI(workingDir, options);
  if (cliResult.success) {
    return cliResult;
  }

  // Final fallback: return manual URL
  const manualUrl = getManualPRUrl(repoInfo, options.head, options.base);
  return {
    success: false,
    prNumber: null,
    prUrl: manualUrl,
    message: `Could not create PR automatically. Create manually: ${manualUrl}`,
    method: 'manual',
  };
}

/**
 * Push branch to remote
 */
export function pushBranch(
  workingDir: string,
  branchName: string
): { success: boolean; message: string } {
  try {
    execSync(`git push -u origin ${branchName}`, {
      cwd: workingDir,
      stdio: 'pipe',
    });

    return {
      success: true,
      message: `Pushed branch ${branchName} to origin`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to push: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
