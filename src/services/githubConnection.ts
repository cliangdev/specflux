/**
 * GitHub Connection Service
 *
 * Manages GitHub OAuth integration for repository sync.
 * Uses the generated API client for backend communication.
 */

import { startOAuthServer, OAuthError } from "../lib/oauth-tauri";
import { api } from "../api/client";
import type { GithubInstallationStatus } from "../api/generated";

export interface GitHubConnectionStatus {
  isConnected: boolean;
  username?: string;
  avatarUrl?: string;
  connectedAt?: Date;
}

/** localStorage key for GitHub connection cache */
export const GITHUB_CONNECTION_KEY = "specflux:github:connection";

/**
 * Connect to GitHub via OAuth flow.
 * Uses shared OAuth server to handle the callback.
 */
export async function connectGitHub(): Promise<void> {
  try {
    // Start OAuth flow using shared server
    // Calls API with auth to get the authUrl, then opens browser
    const result = await startOAuthServer(async (redirectUri) => {
      const response = await api.github.initiateGithubInstall({ redirectUri });
      return response.authUrl;
    });

    // Check for success
    const githubStatus = result.params.get("github");
    if (githubStatus === "error") {
      throw new OAuthError("GitHub authorization failed.", "invalid_response");
    }

    // Extract connection info from callback
    const username = result.params.get("username");

    // Store connection status in local cache
    const status: GitHubConnectionStatus = {
      isConnected: true,
      username: username || undefined,
      connectedAt: new Date(),
    };
    localStorage.setItem(GITHUB_CONNECTION_KEY, JSON.stringify(status));
  } catch (error) {
    console.error("Failed to connect GitHub:", error);
    throw error instanceof OAuthError
      ? error
      : new Error(error instanceof Error ? error.message : "Failed to connect to GitHub");
  }
}

/**
 * Get GitHub connection status from local cache (sync)
 * Use fetchGitHubStatus() for fresh data from backend
 */
export function getGitHubStatus(): GitHubConnectionStatus {
  try {
    const stored = localStorage.getItem(GITHUB_CONNECTION_KEY);
    if (stored) {
      const status = JSON.parse(stored) as GitHubConnectionStatus;
      // Convert connectedAt back to Date
      if (status.connectedAt) {
        status.connectedAt = new Date(status.connectedAt);
      }
      return status;
    }
  } catch (error) {
    console.warn("Failed to load GitHub status from cache:", error);
  }

  return { isConnected: false };
}

/**
 * Fetch GitHub connection status from backend API
 * Updates local cache and returns fresh status
 */
export async function fetchGitHubStatus(): Promise<GitHubConnectionStatus> {
  try {
    const response: GithubInstallationStatus = await api.github.getGithubInstallationStatus();

    const status: GitHubConnectionStatus = {
      isConnected: response.installed,
      username: response.githubUsername ?? undefined,
      // avatarUrl not yet available from backend API
      connectedAt: response.connectedAt ?? undefined,
    };

    // Update local cache
    if (status.isConnected) {
      localStorage.setItem(GITHUB_CONNECTION_KEY, JSON.stringify(status));
    } else {
      localStorage.removeItem(GITHUB_CONNECTION_KEY);
    }

    return status;
  } catch (error) {
    console.warn("Failed to fetch GitHub status from backend:", error);
    // Fall back to cached status
    return getGitHubStatus();
  }
}

/**
 * Disconnect from GitHub
 * Calls backend API to revoke installation and clears local cache
 */
export async function disconnectGitHub(): Promise<void> {
  try {
    // Call backend API to disconnect
    await api.github.disconnectGithubInstallation();

    // Clear local cache
    localStorage.removeItem(GITHUB_CONNECTION_KEY);
  } catch (error) {
    console.error("Failed to disconnect GitHub:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to disconnect from GitHub"
    );
  }
}

/**
 * Check if user is connected to GitHub (sync, from cache)
 */
export function isGitHubConnected(): boolean {
  return getGitHubStatus().isConnected;
}
