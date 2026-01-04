/**
 * Workspace Preferences Service
 *
 * Manages workspace configuration stored in .specflux-workspace/config.json
 * at the workspace root level. This is separate from project-specific data.
 */

import { readTextFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { join, homeDir } from "@tauri-apps/api/path";

const WORKSPACE_DIR = ".specflux-workspace";
const CONFIG_FILE = "config.json";
const DEFAULT_WORKSPACE_SUBDIR = "SpecFlux";

export interface WorkspaceConfig {
  /** The root directory where SpecFlux projects are stored */
  workspacePath: string;
  /** When the workspace was first configured */
  createdAt: string;
  /** Last time the config was updated */
  updatedAt: string;
}

/**
 * Get the default workspace path (~/SpecFlux/)
 */
export async function getDefaultWorkspacePath(): Promise<string> {
  const home = await homeDir();
  return join(home, DEFAULT_WORKSPACE_SUBDIR);
}

/**
 * Get the config file path within a workspace
 */
async function getConfigFilePath(workspacePath: string): Promise<string> {
  return join(workspacePath, WORKSPACE_DIR, CONFIG_FILE);
}

/**
 * Ensure the .specflux-workspace directory exists
 */
async function ensureWorkspaceDir(workspacePath: string): Promise<void> {
  const workspaceConfigDir = await join(workspacePath, WORKSPACE_DIR);
  if (!(await exists(workspaceConfigDir))) {
    await mkdir(workspaceConfigDir, { recursive: true });
  }
}

/**
 * Load workspace configuration from disk
 */
export async function loadWorkspaceConfig(
  workspacePath: string
): Promise<WorkspaceConfig | null> {
  try {
    const configPath = await getConfigFilePath(workspacePath);
    if (await exists(configPath)) {
      const content = await readTextFile(configPath);
      return JSON.parse(content) as WorkspaceConfig;
    }
  } catch (error) {
    console.warn("Failed to load workspace config:", error);
  }
  return null;
}

/**
 * Save workspace configuration to disk
 */
export async function saveWorkspaceConfig(
  config: WorkspaceConfig
): Promise<void> {
  try {
    await ensureWorkspaceDir(config.workspacePath);
    const configPath = await getConfigFilePath(config.workspacePath);
    await writeTextFile(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Failed to save workspace config:", error);
    throw new Error("Failed to save workspace configuration");
  }
}

/**
 * Initialize workspace configuration with a given path
 */
export async function initializeWorkspace(
  workspacePath: string
): Promise<WorkspaceConfig> {
  const now = new Date().toISOString();
  const config: WorkspaceConfig = {
    workspacePath,
    createdAt: now,
    updatedAt: now,
  };

  await saveWorkspaceConfig(config);
  return config;
}

/**
 * Update workspace configuration
 */
export async function updateWorkspaceConfig(
  workspacePath: string,
  updates: Partial<Omit<WorkspaceConfig, "createdAt">>
): Promise<WorkspaceConfig> {
  const existing = await loadWorkspaceConfig(workspacePath);

  const config: WorkspaceConfig = {
    workspacePath: updates.workspacePath || workspacePath,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveWorkspaceConfig(config);
  return config;
}

/**
 * Check if workspace is configured
 */
export async function isWorkspaceConfigured(
  workspacePath: string
): Promise<boolean> {
  const config = await loadWorkspaceConfig(workspacePath);
  return config !== null;
}

/**
 * Get workspace path from localStorage (browser-level persistence)
 * This allows us to remember the workspace across app restarts
 */
export function getStoredWorkspacePath(): string | null {
  try {
    return localStorage.getItem("specflux:workspacePath");
  } catch {
    return null;
  }
}

/**
 * Store workspace path in localStorage
 */
export function storeWorkspacePath(path: string): void {
  try {
    localStorage.setItem("specflux:workspacePath", path);
  } catch (error) {
    console.warn("Failed to store workspace path:", error);
  }
}

/**
 * Clear stored workspace path
 */
export function clearStoredWorkspacePath(): void {
  try {
    localStorage.removeItem("specflux:workspacePath");
  } catch {
    // Ignore errors
  }
}
