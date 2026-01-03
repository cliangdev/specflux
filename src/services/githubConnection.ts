/**
 * GitHub Connection Service
 *
 * Manages GitHub OAuth integration for repository sync.
 */

import { start as startOAuth, onUrl, cancel } from "@fabianlars/tauri-plugin-oauth";
import { open } from "@tauri-apps/plugin-shell";

export interface GitHubConnectionStatus {
  isConnected: boolean;
  username?: string;
  avatarUrl?: string;
  connectedAt?: Date;
}

const GITHUB_CONNECTION_KEY = "specflux:github:connection";

/**
 * Get the backend API URL from environment or default
 */
function getBackendUrl(): string {
  // In production, this would come from env or config
  return import.meta.env.VITE_API_URL || "http://localhost:8090";
}

/**
 * Connect to GitHub via OAuth flow
 * Opens the OAuth flow and redirects to backend /api/github/install
 */
export async function connectGitHub(): Promise<void> {
  const backendUrl = getBackendUrl();

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
        // Store connection status
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
 * Get GitHub connection status
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
    console.warn("Failed to load GitHub status:", error);
  }

  return { isConnected: false };
}

/**
 * Disconnect from GitHub
 * Clears local storage and optionally revokes access on backend
 */
export async function disconnectGitHub(): Promise<void> {
  try {
    // Clear local storage
    localStorage.removeItem(GITHUB_CONNECTION_KEY);

    // TODO: Optionally call backend to revoke GitHub App installation
    // const backendUrl = getBackendUrl();
    // await fetch(`${backendUrl}/api/github/disconnect`, { method: 'POST' });
  } catch (error) {
    console.error("Failed to disconnect GitHub:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to disconnect from GitHub"
    );
  }
}

/**
 * Check if user is connected to GitHub
 */
export function isGitHubConnected(): boolean {
  return getGitHubStatus().isConnected;
}
