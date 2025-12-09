/**
 * Git Operations Service
 *
 * Provides git operations via Tauri shell commands.
 * Cross-platform support for macOS, Windows, and Linux.
 */

import { Command, Child } from "@tauri-apps/plugin-shell";

export interface GitHubUrlInfo {
  owner: string;
  repo: string;
  fullUrl: string;
  /** True if the URL uses SSH alias format (e.g., github.com-work:owner/repo.git) */
  isSshAlias?: boolean;
  /** The SSH alias host if using SSH alias format */
  sshAliasHost?: string;
}

export interface CloneProgress {
  phase: "counting" | "compressing" | "receiving" | "resolving" | "done";
  percent?: number;
  current?: number;
  total?: number;
  message: string;
}

export interface CloneResult {
  success: boolean;
  path: string;
  error?: string;
}

let activeCloneProcess: Child | null = null;

/**
 * Parse a GitHub URL to extract owner and repo name
 * Supports:
 * - HTTPS: https://github.com/owner/repo
 * - HTTPS with .git: https://github.com/owner/repo.git
 * - SSH: git@github.com:owner/repo.git
 * - SSH alias: github.com-alias:owner/repo.git (for multi-account setups)
 */
export function parseGitHubUrl(url: string): GitHubUrlInfo | null {
  const trimmedUrl = url.trim();

  const httpsMatch = trimmedUrl.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?$/i,
  );
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2].replace(/\.git$/, ""),
      fullUrl: trimmedUrl,
    };
  }

  const sshMatch = trimmedUrl.match(
    /^git@github\.com:([^/]+)\/([^/\s]+?)(?:\.git)?$/i,
  );
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2].replace(/\.git$/, ""),
      fullUrl: trimmedUrl,
    };
  }

  const sshAliasMatch = trimmedUrl.match(
    /^([^:@/\s]+):([^/\s]+)\/([^/\s]+?)(?:\.git)?$/,
  );
  if (sshAliasMatch) {
    return {
      owner: sshAliasMatch[2],
      repo: sshAliasMatch[3].replace(/\.git$/, ""),
      fullUrl: trimmedUrl,
      isSshAlias: true,
      sshAliasHost: sshAliasMatch[1],
    };
  }

  return null;
}

/**
 * Validate a GitHub URL format
 */
export function validateGitUrl(url: string): { valid: boolean; error?: string } {
  if (!url.trim()) {
    return { valid: false, error: "URL is required" };
  }

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    return {
      valid: false,
      error: "Invalid URL format. Supported: https://github.com/owner/repo, git@github.com:owner/repo.git, or alias:owner/repo.git",
    };
  }

  return { valid: true };
}

/**
 * Get the clone destination path
 */
export function getClonePath(localPath: string, repoName: string): string {
  // Normalize path separators for cross-platform
  const normalizedLocalPath = localPath.replace(/\\/g, "/").replace(/\/$/, "");
  return `${normalizedLocalPath}/${repoName}`;
}

/**
 * Parse git clone progress output
 * Git outputs progress to stderr in various formats:
 * - "Cloning into 'repo'..."
 * - "remote: Counting objects: 100, done."
 * - "remote: Compressing objects: 50% (50/100)"
 * - "Receiving objects: 75% (75/100), 1.50 MiB | 500.00 KiB/s"
 * - "Resolving deltas: 100% (50/50), done."
 */
export function parseCloneProgress(line: string): CloneProgress | null {
  // Counting objects
  const countingMatch = line.match(/Counting objects:\s*(\d+)/i);
  if (countingMatch) {
    return {
      phase: "counting",
      current: parseInt(countingMatch[1]),
      message: `Counting objects: ${countingMatch[1]}`,
    };
  }

  // Compressing objects with percentage
  const compressingMatch = line.match(
    /Compressing objects:\s*(\d+)%\s*\((\d+)\/(\d+)\)/i,
  );
  if (compressingMatch) {
    return {
      phase: "compressing",
      percent: parseInt(compressingMatch[1]),
      current: parseInt(compressingMatch[2]),
      total: parseInt(compressingMatch[3]),
      message: `Compressing: ${compressingMatch[1]}%`,
    };
  }

  // Receiving objects with percentage
  const receivingMatch = line.match(
    /Receiving objects:\s*(\d+)%\s*\((\d+)\/(\d+)\)/i,
  );
  if (receivingMatch) {
    return {
      phase: "receiving",
      percent: parseInt(receivingMatch[1]),
      current: parseInt(receivingMatch[2]),
      total: parseInt(receivingMatch[3]),
      message: `Receiving: ${receivingMatch[1]}%`,
    };
  }

  // Resolving deltas with percentage
  const resolvingMatch = line.match(
    /Resolving deltas:\s*(\d+)%\s*\((\d+)\/(\d+)\)/i,
  );
  if (resolvingMatch) {
    return {
      phase: "resolving",
      percent: parseInt(resolvingMatch[1]),
      current: parseInt(resolvingMatch[2]),
      total: parseInt(resolvingMatch[3]),
      message: `Resolving: ${resolvingMatch[1]}%`,
    };
  }

  return null;
}

/**
 * Clone a repository from GitHub
 *
 * @param gitUrl - The git URL to clone (can be SSH with custom alias)
 * @param targetPath - The local path to clone to
 * @param onProgress - Callback for progress updates
 * @returns Clone result with success status
 */
export async function cloneRepository(
  gitUrl: string,
  targetPath: string,
  onProgress?: (progress: CloneProgress) => void,
): Promise<CloneResult> {
  try {
    const command = Command.create("git", [
      "clone",
      "--progress",
      gitUrl,
      targetPath,
    ]);

    const child = await command.spawn();
    activeCloneProcess = child;

    let stderr = "";

    command.stdout.on("data", () => {});

    command.stderr.on("data", (line) => {
      stderr += line + "\n";
      if (onProgress) {
        const progress = parseCloneProgress(line);
        if (progress) {
          onProgress(progress);
        }
      }
    });

    const output = await command.execute();
    activeCloneProcess = null;

    if (output.code === 0) {
      if (onProgress) {
        onProgress({ phase: "done", percent: 100, message: "Clone complete" });
      }
      return { success: true, path: targetPath };
    } else {
      let errorMessage = "Clone failed";

      if (stderr.includes("Repository not found")) {
        errorMessage =
          "Repository not found. Check the URL and your access permissions.";
      } else if (
        stderr.includes("Authentication failed") ||
        stderr.includes("Permission denied")
      ) {
        errorMessage =
          "Authentication failed. Make sure your SSH keys or credentials are configured.";
      } else if (stderr.includes("already exists")) {
        errorMessage =
          "Directory already exists. Choose a different location or use Browse Local.";
      } else if (stderr.includes("Could not resolve host")) {
        errorMessage =
          "Network error. Check your internet connection and try again.";
      } else if (stderr) {
        const lines = stderr.trim().split("\n").filter(Boolean);
        errorMessage = lines[lines.length - 1] || "Clone failed";
      }

      return { success: false, path: targetPath, error: errorMessage };
    }
  } catch (err) {
    activeCloneProcess = null;
    return {
      success: false,
      path: targetPath,
      error: err instanceof Error ? err.message : "Failed to execute git clone",
    };
  }
}

/**
 * Cancel an in-progress clone operation
 */
export async function cancelClone(): Promise<void> {
  if (activeCloneProcess) {
    try {
      await activeCloneProcess.kill();
    } catch {
      // Kill errors are expected when process already terminated
    }
    activeCloneProcess = null;
  }
}

/**
 * Check if a directory exists
 */
export async function checkDirectoryExists(path: string): Promise<boolean> {
  try {
    const command = Command.create("test", ["-d", path]);
    const output = await command.execute();
    return output.code === 0;
  } catch {
    return false;
  }
}

/**
 * Get the default branch of a cloned repository
 */
export async function getDefaultBranch(repoPath: string): Promise<string> {
  try {
    const command = Command.create("git", [
      "-C",
      repoPath,
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ]);
    const output = await command.execute();
    if (output.code === 0) {
      return output.stdout.trim() || "main";
    }
  } catch {
    // Fall through to default
  }
  return "main";
}

/**
 * Build SSH URL for a GitHub repo
 */
export function buildGitHubSshUrl(
  owner: string,
  repo: string,
  sshAlias?: string,
): string {
  if (sshAlias) {
    return `${sshAlias}:${owner}/${repo}.git`;
  }
  return `git@github.com:${owner}/${repo}.git`;
}

/**
 * Add a remote to a repository
 */
export async function addRemote(
  repoPath: string,
  remoteName: string,
  remoteUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const command = Command.create("git", [
      "-C",
      repoPath,
      "remote",
      "add",
      remoteName,
      remoteUrl,
    ]);
    const output = await command.execute();
    if (output.code === 0) {
      return { success: true };
    }
    return {
      success: false,
      error: output.stderr || "Failed to add remote",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add remote",
    };
  }
}

/**
 * Get list of remotes for a repository
 */
export async function getRemotes(
  repoPath: string,
): Promise<{ name: string; url: string }[]> {
  try {
    const command = Command.create("git", ["-C", repoPath, "remote", "-v"]);
    const output = await command.execute();
    if (output.code === 0) {
      const remotes: { name: string; url: string }[] = [];
      const lines = output.stdout.trim().split("\n");
      for (const line of lines) {
        const match = line.match(/^(\S+)\s+(\S+)\s+\(fetch\)$/);
        if (match) {
          remotes.push({ name: match[1], url: match[2] });
        }
      }
      return remotes;
    }
  } catch {
    // Fall through to empty array
  }
  return [];
}
