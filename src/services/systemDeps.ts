/**
 * System Dependencies Service
 *
 * Detects and validates system dependencies required for SpecFlux operations.
 * Cross-platform support for macOS, Windows, and Linux.
 */

import { Command } from "@tauri-apps/plugin-shell";

export type Platform = "macos" | "windows" | "linux" | "unknown";

export interface DependencyStatus {
  available: boolean;
  version?: string;
  error?: string;
}

export type GitStatus = DependencyStatus;

export type ClaudeCliStatus = DependencyStatus;

export type HealthStatus = "healthy" | "warning" | "error";

export interface HealthCheckItem {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
  required: boolean;
  action?: string;
}

export interface ProjectHealthResult {
  status: HealthStatus;
  items: HealthCheckItem[];
}

/**
 * Get the current platform from navigator
 */
export function getPlatform(): Platform {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes("mac")) {
    return "macos";
  } else if (userAgent.includes("win")) {
    return "windows";
  } else if (userAgent.includes("linux")) {
    return "linux";
  }

  return "unknown";
}

/**
 * Detect if git is installed and get its version
 * Works cross-platform (macOS, Windows, Linux)
 */
export async function detectGit(): Promise<GitStatus> {
  try {
    const command = Command.create("git", ["--version"]);
    const output = await command.execute();

    if (output.code === 0) {
      // Parse version from "git version 2.39.0" or similar
      const versionMatch = output.stdout.match(/git version ([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : undefined;
      return { available: true, version };
    } else {
      return {
        available: false,
        error: output.stderr || "Git command failed",
      };
    }
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : "Failed to detect git",
    };
  }
}

/**
 * Command names for Claude CLI as registered in Tauri capabilities.
 * These map to different installation paths to handle apps launched outside terminal.
 */
const CLAUDE_COMMAND_NAMES = [
  "claude",           // Default PATH lookup
  "claude-npm-global", // ~/.npm-global/bin/claude
  "claude-local-bin",  // ~/.local/bin/claude
  "claude-usr-local",  // /usr/local/bin/claude
  "claude-homebrew",   // /opt/homebrew/bin/claude
];

/**
 * Detect if Claude CLI is installed and get its version
 * Works cross-platform (macOS, Windows, Linux)
 * Checks multiple common installation paths when launched outside terminal
 */
export async function detectClaudeCli(): Promise<ClaudeCliStatus> {
  for (const cmdName of CLAUDE_COMMAND_NAMES) {
    try {
      const command = Command.create(cmdName, ["--version"]);
      const output = await command.execute();

      if (output.code === 0) {
        const version = output.stdout.trim();
        return { available: true, version };
      }
    } catch {
      // Try next command name
      continue;
    }
  }

  return {
    available: false,
    error: "Claude CLI not found in common installation paths",
  };
}

/**
 * Get platform-specific install instructions for git
 */
export function getGitInstallInstructions(os: Platform): string {
  switch (os) {
    case "macos":
      return "Install via Homebrew: brew install git\nOr install Xcode Command Line Tools: xcode-select --install";
    case "windows":
      return "Download from https://git-scm.com/download/win";
    case "linux":
      return "Install via package manager:\n  Ubuntu/Debian: sudo apt install git\n  Fedora: sudo dnf install git\n  Arch: sudo pacman -S git";
    default:
      return "Visit https://git-scm.com/downloads for installation instructions";
  }
}

/**
 * Get platform-specific install instructions for Claude CLI
 */
export function getClaudeCliInstallInstructions(): string {
  return "Install via npm (all platforms):\n  npm install -g @anthropic-ai/claude-code";
}

/**
 * Check project health by validating all dependencies
 *
 * @param hasLocalPath - Whether the project has a local path configured
 */
export async function getProjectHealth(
  hasLocalPath: boolean,
): Promise<ProjectHealthResult> {
  const items: HealthCheckItem[] = [];

  // Check Local Path (REQUIRED)
  items.push({
    name: "Local Path",
    status: hasLocalPath ? "ok" : "error",
    message: hasLocalPath
      ? "Project local path is configured"
      : "Project local path is not set",
    required: true,
    action: hasLocalPath ? undefined : "Set local path in General Settings",
  });

  // Check Git (REQUIRED)
  const gitStatus = await detectGit();
  items.push({
    name: "Git",
    status: gitStatus.available ? "ok" : "error",
    message: gitStatus.available
      ? `Git ${gitStatus.version || ""} detected`
      : gitStatus.error || "Git not found",
    required: true,
    action: gitStatus.available ? undefined : "Install Git",
  });

  // Check Claude CLI (RECOMMENDED)
  const claudeStatus = await detectClaudeCli();
  items.push({
    name: "Claude CLI",
    status: claudeStatus.available ? "ok" : "warning",
    message: claudeStatus.available
      ? `Claude CLI detected`
      : "Claude CLI not found - required for AI agent tasks",
    required: false,
    action: claudeStatus.available ? undefined : "Install Claude CLI",
  });

  // Calculate overall status
  const hasError = items.some(
    (item) => item.required && item.status === "error",
  );
  const hasWarning = items.some((item) => item.status === "warning");

  let status: HealthStatus;
  if (hasError) {
    status = "error";
  } else if (hasWarning) {
    status = "warning";
  } else {
    status = "healthy";
  }

  return { status, items };
}
