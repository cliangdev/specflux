/**
 * v2 API Client Configuration
 *
 * Provides configured API instances for the Spring Boot backend.
 * Uses Firebase JWT authentication via Bearer token.
 */

import {
  Configuration,
  EpicsApi,
  ProjectsApi,
  ReleasesApi,
  TasksApi,
  UsersApi,
} from "./generated";
import { getIdToken } from "../../lib/firebase";

/**
 * Get current Firebase ID token for Authorization header.
 * Returns empty string if not authenticated (will result in 401).
 */
async function getAuthToken(): Promise<string> {
  const token = await getIdToken();
  console.log(
    "[v2 API] Getting auth token:",
    token ? `${token.substring(0, 20)}...` : "null",
  );
  return token || "";
}

/**
 * Create API configuration with Firebase authentication.
 * Uses accessToken function for lazy token retrieval.
 */
function createConfiguration(): Configuration {
  const basePath =
    import.meta.env.VITE_V2_API_BASE_URL || "http://localhost:8090/api";
  console.log("[v2 API] Using base path:", basePath);
  return new Configuration({
    basePath,
    accessToken: getAuthToken,
  });
}

/**
 * v2 API client instances for Spring Boot backend.
 * Each instance is created fresh to ensure current auth token is used.
 *
 * Available APIs:
 * - epics: Epic management (nested under projects)
 * - projects: Project CRUD
 * - releases: Release management (nested under projects)
 * - tasks: Task CRUD with dependencies and acceptance criteria
 * - users: User profile management
 */
export const v2Api = {
  get epics() {
    return new EpicsApi(createConfiguration());
  },
  get projects() {
    return new ProjectsApi(createConfiguration());
  },
  get releases() {
    return new ReleasesApi(createConfiguration());
  },
  get tasks() {
    return new TasksApi(createConfiguration());
  },
  get users() {
    return new UsersApi(createConfiguration());
  },
};

// Re-export types and APIs for direct usage if needed
export {
  Configuration,
  EpicsApi,
  ProjectsApi,
  ReleasesApi,
  TasksApi,
  UsersApi,
};

// Re-export all models
export * from "./generated/models";
