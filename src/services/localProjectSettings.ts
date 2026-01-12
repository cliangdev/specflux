/**
 * Local Project Settings Service
 *
 * Manages per-user project settings stored in localStorage.
 * These settings are machine-specific and not synced to the backend.
 *
 * This solves the multi-user problem where different users have
 * the same project at different filesystem locations.
 */

const STORAGE_KEY = "specflux:projectSettings";

export interface LocalProjectSettings {
  /** Local filesystem path to the project directory */
  localPath: string;
  /** When this setting was last updated */
  updatedAt: string;
}

interface ProjectSettingsStore {
  [projectId: string]: LocalProjectSettings;
}

/**
 * Load all project settings from localStorage
 */
function loadAllSettings(): ProjectSettingsStore {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as ProjectSettingsStore;
    }
  } catch (error) {
    console.warn("Failed to load project settings:", error);
  }
  return {};
}

/**
 * Save all project settings to localStorage
 */
function saveAllSettings(settings: ProjectSettingsStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save project settings:", error);
  }
}

/**
 * Get local settings for a specific project
 */
export function getLocalProjectSettings(
  projectId: string
): LocalProjectSettings | null {
  const settings = loadAllSettings();
  return settings[projectId] || null;
}

/**
 * Get the local path for a project
 */
export function getLocalProjectPath(projectId: string): string | null {
  const settings = getLocalProjectSettings(projectId);
  return settings?.localPath || null;
}

/**
 * Set the local path for a project
 */
export function setLocalProjectPath(projectId: string, localPath: string): void {
  const settings = loadAllSettings();
  settings[projectId] = {
    localPath,
    updatedAt: new Date().toISOString(),
  };
  saveAllSettings(settings);
}

/**
 * Remove local settings for a project
 */
export function removeLocalProjectSettings(projectId: string): void {
  const settings = loadAllSettings();
  delete settings[projectId];
  saveAllSettings(settings);
}

/**
 * Check if a project has local path configured
 */
export function hasLocalProjectPath(projectId: string): boolean {
  return getLocalProjectPath(projectId) !== null;
}

/**
 * Get the full path for a repository by combining project localPath with repo relative path
 */
export function getFullRepositoryPath(
  projectId: string,
  repoRelativePath: string
): string | null {
  const localPath = getLocalProjectPath(projectId);
  if (!localPath) return null;

  // Normalize paths - remove trailing slash from localPath
  const normalizedLocalPath = localPath.replace(/\/+$/, "");
  // Remove leading slash from relative path if present
  const normalizedRepoPath = repoRelativePath.replace(/^\/+/, "");

  return `${normalizedLocalPath}/${normalizedRepoPath}`;
}

/**
 * Migrate localPath from backend project to local storage
 * Call this when loading a project that has localPath in backend but not locally
 */
export function migrateProjectLocalPath(
  projectId: string,
  backendLocalPath: string
): void {
  // Only migrate if we don't already have a local setting
  if (!hasLocalProjectPath(projectId) && backendLocalPath) {
    setLocalProjectPath(projectId, backendLocalPath);
  }
}

/**
 * Get all project IDs that have local settings
 */
export function getAllConfiguredProjectIds(): string[] {
  const settings = loadAllSettings();
  return Object.keys(settings);
}
