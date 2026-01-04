/**
 * Project Sync Service
 *
 * Manages project synchronization with GitHub repositories.
 * Coordinates between backend GitHub API and Tauri git commands.
 */

import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { exists } from "@tauri-apps/plugin-fs";
import { getStoredWorkspacePath } from "./workspacePreferences";
import { isGitHubConnected } from "./githubConnection";

interface GitStatus {
  branch: string;
  has_changes: boolean;
  staged_files: string[];
  unstaged_files: string[];
  untracked_files: string[];
}

interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Get the project directory path
 */
async function getProjectPath(projectRef: string): Promise<string> {
  const workspacePath = getStoredWorkspacePath();
  if (!workspacePath) {
    throw new Error("Workspace not configured");
  }
  return join(workspacePath, projectRef);
}

/**
 * Initialize project sync: creates GitHub repo and clones it locally
 *
 * @param projectRef - Project reference/slug
 * @param repoName - Repository name (e.g., "my-app")
 * @param description - Optional repository description
 * @param isPrivate - Whether repository should be private (default: true)
 */
export async function initializeProjectSync(
  projectRef: string,
  repoName: string,
  description?: string,
  _isPrivate: boolean = true
): Promise<SyncResult> {
  try {
    // Check GitHub connection
    if (!isGitHubConnected()) {
      throw new Error("GitHub not connected. Please connect your GitHub account first.");
    }

    const projectPath = await getProjectPath(projectRef);

    // Check if project directory already exists
    const pathExists = await exists(projectPath);
    if (pathExists) {
      // Check if it's already a git repo
      const gitStatus = await getGitStatus(projectRef);
      if (gitStatus) {
        return {
          success: false,
          error: "Project already has a git repository",
        };
      }
    }

    // TODO: Call backend API to create GitHub repository
    // const backendUrl = getBackendUrl();
    // const response = await fetch(`${backendUrl}/api/github/repos`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ name: repoName, description, private: isPrivate })
    // });
    // const { clone_url } = await response.json();

    // For now, assume the repo URL is constructed
    const cloneUrl = `https://github.com/USER/${repoName}.git`; // This should come from backend

    // Clone the repository
    await invoke<void>("git_clone_repo", {
      repoUrl: cloneUrl,
      targetDir: projectPath,
    });

    return {
      success: true,
      message: `Repository ${repoName} initialized and cloned successfully`,
    };
  } catch (error) {
    console.error("Failed to initialize project sync:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to initialize sync",
    };
  }
}

/**
 * Clone an existing GitHub repository for a project
 *
 * @param projectRef - Project reference/slug
 * @param repoUrl - Full git clone URL (e.g., "https://github.com/user/repo.git")
 */
export async function cloneProjectRepo(
  projectRef: string,
  repoUrl: string
): Promise<SyncResult> {
  try {
    const projectPath = await getProjectPath(projectRef);

    // Check if directory already exists
    const pathExists = await exists(projectPath);
    if (pathExists) {
      return {
        success: false,
        error: "Project directory already exists",
      };
    }

    // Clone the repository
    await invoke<void>("git_clone_repo", {
      repoUrl,
      targetDir: projectPath,
    });

    return {
      success: true,
      message: "Repository cloned successfully",
    };
  } catch (error) {
    console.error("Failed to clone repository:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clone repository",
    };
  }
}

/**
 * Get git status for a project
 */
export async function getGitStatus(projectRef: string): Promise<GitStatus | null> {
  try {
    const projectPath = await getProjectPath(projectRef);
    const pathExists = await exists(projectPath);

    if (!pathExists) {
      return null;
    }

    const status = await invoke<GitStatus>("git_get_status", {
      repoDir: projectPath,
    });

    return status;
  } catch (error) {
    console.error("Failed to get git status:", error);
    return null;
  }
}

/**
 * Auto-commit changes with a message
 *
 * @param projectRef - Project reference/slug
 * @param message - Commit message
 */
export async function autoCommitChanges(
  projectRef: string,
  message: string
): Promise<SyncResult> {
  try {
    const projectPath = await getProjectPath(projectRef);

    // Check if there are any changes first
    const status = await getGitStatus(projectRef);
    if (!status || !status.has_changes) {
      return {
        success: true,
        message: "No changes to commit",
      };
    }

    // Use git_auto_commit which adds all changes and commits
    await invoke<void>("git_auto_commit", {
      repoDir: projectPath,
      message,
    });

    return {
      success: true,
      message: "Changes committed successfully",
    };
  } catch (error) {
    console.error("Failed to auto-commit changes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to commit changes",
    };
  }
}

/**
 * Push local commits to remote
 */
export async function pushChanges(projectRef: string): Promise<SyncResult> {
  try {
    const projectPath = await getProjectPath(projectRef);

    await invoke<void>("git_push_changes", {
      repoDir: projectPath,
    });

    return {
      success: true,
      message: "Changes pushed successfully",
    };
  } catch (error) {
    console.error("Failed to push changes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to push changes",
    };
  }
}

/**
 * Pull changes from remote
 */
export async function pullChanges(projectRef: string): Promise<SyncResult> {
  try {
    const projectPath = await getProjectPath(projectRef);

    await invoke<void>("git_pull_changes", {
      repoDir: projectPath,
    });

    return {
      success: true,
      message: "Changes pulled successfully",
    };
  } catch (error) {
    console.error("Failed to pull changes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to pull changes",
    };
  }
}

/**
 * Fetch from remote to check for updates
 */
export async function fetchRemote(projectRef: string): Promise<SyncResult> {
  try {
    const projectPath = await getProjectPath(projectRef);

    await invoke<void>("git_fetch_remote", {
      repoDir: projectPath,
    });

    return {
      success: true,
      message: "Fetched from remote successfully",
    };
  } catch (error) {
    console.error("Failed to fetch from remote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch from remote",
    };
  }
}

/**
 * Sync project: intelligently push or pull as needed
 *
 * @param projectRef - Project reference/slug
 */
export async function syncProject(projectRef: string): Promise<SyncResult> {
  try {
    // First fetch to get latest remote state
    await fetchRemote(projectRef);

    const status = await getGitStatus(projectRef);
    if (!status) {
      return {
        success: false,
        error: "Project is not a git repository",
      };
    }

    // If we have uncommitted changes, commit them first
    if (status.has_changes) {
      const commitResult = await autoCommitChanges(
        projectRef,
        "chore: auto-commit before sync"
      );
      if (!commitResult.success) {
        return commitResult;
      }
    }

    // TODO: Check if we're ahead or behind remote and act accordingly
    // For now, just try to pull then push
    const pullResult = await pullChanges(projectRef);
    if (!pullResult.success) {
      // If pull fails due to conflicts, return error
      if (pullResult.error?.includes("conflict")) {
        return {
          success: false,
          error: "Merge conflicts detected. Please resolve manually.",
        };
      }
    }

    // Push any local commits
    const pushResult = await pushChanges(projectRef);
    if (!pushResult.success) {
      return pushResult;
    }

    return {
      success: true,
      message: "Project synced successfully",
    };
  } catch (error) {
    console.error("Failed to sync project:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync project",
    };
  }
}

/**
 * Check if project has a git repository
 */
export async function hasGitRepo(projectRef: string): Promise<boolean> {
  const status = await getGitStatus(projectRef);
  return status !== null;
}
