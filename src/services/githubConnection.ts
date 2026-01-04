/**
 * GitHub Connection Service
 *
 * Manages GitHub OAuth integration for repository sync.
 * Uses the generated API client for backend communication.
 */

import { start as startOAuth, onUrl, cancel } from "@fabianlars/tauri-plugin-oauth";
import { open } from "@tauri-apps/plugin-shell";
import { getApiBaseUrl } from "../lib/environment";
import { api } from "../api/client";
import type { GithubStatus } from "../api/generated";

export interface GitHubConnectionStatus {
  isConnected: boolean;
  username?: string;
  avatarUrl?: string;
  connectedAt?: Date;
}

const GITHUB_CONNECTION_KEY = "specflux:github:connection";

/**
 * Connect to GitHub via OAuth flow
 * Opens the OAuth flow and redirects to backend /api/github/install
 */
export async function connectGitHub(): Promise<void> {
  const backendUrl = getApiBaseUrl();

  try {
    // Start local OAuth server
    const port = await startOAuth();

    // Build the OAuth URL with callback to local server
    const redirectUri = `http://localhost:${port}`;
    const oauthUrl = `${backendUrl}/api/github/install?redirect_uri=${encodeURIComponent(redirectUri)}`;

    // Listen for OAuth callback
    const unlisten = await onUrl((url) => {
      // Extract tokens from callback URL
      const callbackUrl = new URL(url);
      const token = callbackUrl.searchParams.get("token");
      const username = callbackUrl.searchParams.get("username");
      const avatarUrl = callbackUrl.searchParams.get("avatar_url");

      if (token && username) {
        // Store connection status in local cache
        const status: GitHubConnectionStatus = {
          isConnected: true,
          username,
          avatarUrl: avatarUrl || undefined,
          connectedAt: new Date(),
        };

        localStorage.setItem(GITHUB_CONNECTION_KEY, JSON.stringify(status));
      }

      // Clean up
      unlisten();
      cancel(port);
    });

    // Open browser to start OAuth flow
    await open(oauthUrl);

    // Wait for callback (with timeout)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        unlisten();
        cancel(port);
        reject(new Error("OAuth timeout - no response received"));
      }, 120000); // 2 minute timeout

      // Check periodically if connection was established
      const checkInterval = setInterval(() => {
        const status = getGitHubStatus();
        if (status.isConnected) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });
  } catch (error) {
    console.error("Failed to connect GitHub:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to connect to GitHub"
    );
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
    const response: GithubStatus = await api.github.getGithubStatus();

    const status: GitHubConnectionStatus = {
      isConnected: response.installed,
      username: response.githubUsername ?? undefined,
      avatarUrl: response.avatarUrl ?? undefined,
      connectedAt: response.connectedAt ? new Date(response.connectedAt) : undefined,
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
    await api.github.disconnectGithub();

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
