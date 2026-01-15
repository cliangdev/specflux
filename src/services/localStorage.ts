/**
 * Centralized localStorage Service
 *
 * This module provides a single source of truth for all localStorage keys
 * and type-safe accessors. All localStorage usage should go through this service.
 *
 * ## Key Naming Convention
 * All keys use the `specflux:` prefix with colon separators:
 * - `specflux:category:name` for namespaced keys
 * - `specflux:category:name:{id}` for dynamic keys with IDs
 *
 * ## Categories
 * - `app` - Application-level settings (theme, sidebar, environment)
 * - `auth` - Authentication state (user, github connection)
 * - `project` - Project-related settings (selected project, routes)
 * - `workspace` - Workspace configuration (path)
 * - `ui` - UI state (filters, view modes, dismissed banners)
 * - `terminal` - Terminal panel state
 */

// ============================================================================
// Key Registry - Single source of truth for all localStorage keys
// ============================================================================

export const STORAGE_KEYS = {
  // App-level settings
  APP_THEME: "specflux:app:theme",
  APP_SIDEBAR: "specflux:app:sidebar",
  APP_ENVIRONMENT: "specflux:app:environment",

  // Authentication
  AUTH_SAVED_EMAIL: "specflux:auth:saved-email",
  AUTH_PENDING_GITHUB: "specflux:auth:pending-github",
  AUTH_GITHUB_CONNECTION: "specflux:auth:github-connection",
  AUTH_LAST_USER_ID: "specflux:auth:last-user-id",

  // Project settings
  PROJECT_SELECTED_ID: "specflux:project:selected-id",
  PROJECT_ROUTES: "specflux:project:routes",
  PROJECT_SETTINGS: "specflux:project:settings", // Per-project local paths

  // Workspace
  WORKSPACE_PATH: "specflux:workspace:path",

  // UI state
  UI_TASKS_FILTERS: "specflux:ui:tasks-filters",
  UI_EPICS_FILTERS: "specflux:ui:epics-filters",
  UI_EPICS_VIEW: "specflux:ui:epics-view",

  // Terminal
  TERMINAL_PANEL: "specflux:terminal:panel",
} as const;

// Dynamic key generators
export const DYNAMIC_KEYS = {
  /** PRD banner dismissed state: specflux:ui:prd-banner-dismissed:{prdId} */
  prdBannerDismissed: (prdId: string) => `specflux:ui:prd-banner-dismissed:${prdId}`,
} as const;

// ============================================================================
// Type-safe Accessors
// ============================================================================

/**
 * Get a value from localStorage with type safety
 */
export function getStorageItem<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return null;
    return JSON.parse(stored) as T;
  } catch {
    return null;
  }
}

/**
 * Get a string value from localStorage (no JSON parsing)
 */
export function getStorageString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Set a value in localStorage with type safety
 */
export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save to localStorage [${key}]:`, error);
  }
}

/**
 * Set a string value in localStorage (no JSON stringifying)
 */
export function setStorageString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to save to localStorage [${key}]:`, error);
  }
}

/**
 * Remove a value from localStorage
 */
export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore errors
  }
}

/**
 * Check if a key exists in localStorage
 */
export function hasStorageItem(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}
