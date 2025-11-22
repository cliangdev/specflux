/**
 * API Client Configuration
 *
 * Provides configured API instances with authentication headers.
 * The X-User-Id header is required for all authenticated endpoints.
 */

import {
  Configuration,
  EpicsApi,
  FilesApi,
  HealthApi,
  NotificationsApi,
  ProjectsApi,
  RepositoriesApi,
  TasksApi,
  UsersApi,
} from "./generated";

// Default user ID for local desktop app (single-user mode)
let currentUserId = 1;

/**
 * Set the current user ID for API requests
 */
export function setUserId(userId: number): void {
  currentUserId = userId;
}

/**
 * Get the current user ID
 */
export function getUserId(): number {
  return currentUserId;
}

/**
 * Create API configuration with authentication headers
 */
function createConfiguration(): Configuration {
  return new Configuration({
    basePath: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
    headers: {
      "X-User-Id": String(currentUserId),
    },
  });
}

/**
 * API client instances
 * Each instance is created fresh to ensure current user ID is used
 */
export const api = {
  get epics() {
    return new EpicsApi(createConfiguration());
  },
  get files() {
    return new FilesApi(createConfiguration());
  },
  get health() {
    return new HealthApi(createConfiguration());
  },
  get notifications() {
    return new NotificationsApi(createConfiguration());
  },
  get projects() {
    return new ProjectsApi(createConfiguration());
  },
  get repositories() {
    return new RepositoriesApi(createConfiguration());
  },
  get tasks() {
    return new TasksApi(createConfiguration());
  },
  get users() {
    return new UsersApi(createConfiguration());
  },
};

// Export API classes for custom configuration if needed
export {
  Configuration,
  EpicsApi,
  FilesApi,
  HealthApi,
  NotificationsApi,
  ProjectsApi,
  RepositoriesApi,
  TasksApi,
  UsersApi,
};
