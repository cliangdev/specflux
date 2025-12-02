/**
 * Backend Settings Store
 *
 * Manages settings for the hybrid v1/v2 backend architecture.
 * Settings are persisted to localStorage.
 */

const STORAGE_KEY = "specflux-backend-settings";

export interface BackendSettings {
  /** Whether v2 (Spring Boot) backend is enabled for cloud domains */
  v2Enabled: boolean;
  /** Base URL for v2 API */
  v2BaseUrl: string;
  /** Whether data migration from v1 to v2 has been completed */
  migrationComplete: boolean;
  /** Timestamp when migration was completed */
  migrationCompletedAt: string | null;
}

const defaultSettings: BackendSettings = {
  v2Enabled: false,
  v2BaseUrl:
    import.meta.env.VITE_V2_API_BASE_URL || "http://localhost:8090/api",
  migrationComplete: false,
  migrationCompletedAt: null,
};

// In-memory cache of settings
let cachedSettings: BackendSettings | null = null;

// Listeners for settings changes
type Listener = (settings: BackendSettings) => void;
const listeners: Set<Listener> = new Set();

/**
 * Load settings from localStorage.
 */
function loadFromStorage(): BackendSettings {
  if (typeof window === "undefined") {
    return { ...defaultSettings };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.warn("Failed to load backend settings from localStorage:", e);
  }

  return { ...defaultSettings };
}

/**
 * Save settings to localStorage.
 */
function saveToStorage(settings: BackendSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Failed to save backend settings to localStorage:", e);
  }
}

/**
 * Notify all listeners of settings change.
 */
function notifyListeners(settings: BackendSettings): void {
  listeners.forEach((listener) => {
    try {
      listener(settings);
    } catch (e) {
      console.warn("Backend settings listener error:", e);
    }
  });
}

/**
 * Get current backend settings.
 */
export function getBackendSettings(): BackendSettings {
  if (!cachedSettings) {
    cachedSettings = loadFromStorage();
  }
  return { ...cachedSettings };
}

/**
 * Update backend settings.
 * Only provided fields are updated.
 */
export function updateBackendSettings(
  updates: Partial<BackendSettings>,
): BackendSettings {
  const current = getBackendSettings();
  const updated = { ...current, ...updates };

  cachedSettings = updated;
  saveToStorage(updated);
  notifyListeners(updated);

  return updated;
}

/**
 * Check if v2 backend is enabled.
 */
export function isV2Enabled(): boolean {
  return getBackendSettings().v2Enabled;
}

/**
 * Enable v2 backend.
 */
export function enableV2(): void {
  updateBackendSettings({ v2Enabled: true });
}

/**
 * Disable v2 backend (fallback to v1).
 */
export function disableV2(): void {
  updateBackendSettings({ v2Enabled: false });
}

/**
 * Mark migration as complete.
 */
export function markMigrationComplete(): void {
  updateBackendSettings({
    migrationComplete: true,
    migrationCompletedAt: new Date().toISOString(),
  });
}

/**
 * Reset migration status (for re-migration).
 */
export function resetMigration(): void {
  updateBackendSettings({
    migrationComplete: false,
    migrationCompletedAt: null,
  });
}

/**
 * Subscribe to settings changes.
 * Returns unsubscribe function.
 */
export function subscribeToBackendSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Reset all settings to defaults.
 */
export function resetBackendSettings(): void {
  cachedSettings = { ...defaultSettings };
  saveToStorage(cachedSettings);
  notifyListeners(cachedSettings);
}
