/**
 * Environment Configuration
 *
 * Provides environment detection and runtime backend switching for development.
 * Production users never see environment indicators.
 *
 * Environment detection priority:
 * 1. localStorage override (for runtime switching)
 * 2. Vite mode from VITE_ENV_NAME or import.meta.env.MODE
 * 3. Fallback to 'local'
 */

export type Environment = "local" | "staging";

interface EnvironmentConfig {
  name: Environment;
  displayName: string;
  apiBaseUrl: string;
  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
  };
  firebaseEmulatorUrl: string | null;
}

const LOCAL_STORAGE_KEY = "specflux_environment_override";

/**
 * Check if we're in development mode (shows environment indicator).
 * Production builds hide all environment switching UI.
 */
export function isDevelopmentMode(): boolean {
  return import.meta.env.DEV;
}

/**
 * Get the current environment from localStorage override or Vite mode.
 */
export function getCurrentEnvironment(): Environment {
  const override = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (override === "local" || override === "staging") {
    return override;
  }

  if (import.meta.env.VITE_ENV_NAME === "staging") {
    return "staging";
  }

  if (import.meta.env.MODE === "staging") {
    return "staging";
  }

  return "local";
}

/**
 * Set environment override in localStorage.
 * Only works in development mode.
 */
export function setEnvironmentOverride(env: Environment | null): void {
  if (!isDevelopmentMode()) {
    return;
  }

  if (env === null) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } else {
    localStorage.setItem(LOCAL_STORAGE_KEY, env);
  }

  window.location.reload();
}

/**
 * Check if there's an active environment override.
 */
export function hasEnvironmentOverride(): boolean {
  return localStorage.getItem(LOCAL_STORAGE_KEY) !== null;
}

/**
 * Clear any environment override and use default from Vite mode.
 */
export function clearEnvironmentOverride(): void {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  window.location.reload();
}

/**
 * Get configuration for the current environment.
 * Falls back to environment variables if available, otherwise uses defaults.
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = getCurrentEnvironment();

  if (env === "staging") {
    return {
      name: "staging",
      displayName: "Staging",
      apiBaseUrl:
        import.meta.env.VITE_STAGING_API_BASE_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        "https://specflux-backend-400514527718.us-west1.run.app",
      firebaseConfig: {
        apiKey:
          import.meta.env.VITE_STAGING_FIREBASE_API_KEY ||
          import.meta.env.VITE_FIREBASE_API_KEY ||
          "",
        authDomain:
          import.meta.env.VITE_STAGING_FIREBASE_AUTH_DOMAIN ||
          import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
          "",
        projectId:
          import.meta.env.VITE_STAGING_FIREBASE_PROJECT_ID ||
          import.meta.env.VITE_FIREBASE_PROJECT_ID ||
          "",
      },
      firebaseEmulatorUrl: null,
    };
  }

  return {
    name: "local",
    displayName: "Local",
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8090",
    firebaseConfig: {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "fake-api-key",
      authDomain:
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
        "demo-specflux.firebaseapp.com",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-specflux",
    },
    firebaseEmulatorUrl:
      import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL ||
      "http://127.0.0.1:9099",
  };
}

/**
 * Get the API base URL for the current environment.
 * Used by the API client.
 */
export function getApiBaseUrl(): string {
  return getEnvironmentConfig().apiBaseUrl;
}

/**
 * Check if Firebase emulator should be used.
 */
export function shouldUseFirebaseEmulator(): boolean {
  const config = getEnvironmentConfig();
  return config.firebaseEmulatorUrl !== null;
}

/**
 * Get Firebase emulator URL if applicable.
 */
export function getFirebaseEmulatorUrl(): string | null {
  return getEnvironmentConfig().firebaseEmulatorUrl;
}
