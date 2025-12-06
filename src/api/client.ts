/**
 * API Client Configuration
 *
 * Provides configured API instances for the Spring Boot backend.
 * Uses Firebase JWT authentication via Bearer token.
 */

import {
  Configuration,
  AgentsApi,
  EpicsApi,
  McpServersApi,
  ProjectsApi,
  ReleasesApi,
  RepositoriesApi,
  SkillsApi,
  TasksApi,
  UsersApi,
} from "./generated";
import { getIdToken } from "../lib/firebase";

/**
 * Get current Firebase ID token for Authorization header.
 * Returns empty string if not authenticated (will result in 401).
 *
 * Note: This function is called per-request by the generated OpenAPI client,
 * so we don't need to create new API instances for each call.
 */
async function getAuthToken(): Promise<string> {
  const token = await getIdToken();
  console.log(
    "[API] Getting auth token:",
    token ? `${token.substring(0, 20)}...` : "null",
  );
  return token || "";
}

/**
 * Shared configuration for all API clients.
 * The accessToken callback is invoked per-request, ensuring fresh tokens.
 */
const config = new Configuration({
  basePath: import.meta.env.VITE_API_BASE_URL || "http://localhost:8090",
  accessToken: getAuthToken,
});

/**
 * API client instances for Spring Boot backend.
 * Singleton instances that share the same configuration.
 * Auth tokens are refreshed per-request via the accessToken callback.
 *
 * Available APIs:
 * - agents: Agent management (nested under projects)
 * - epics: Epic management (nested under projects)
 * - mcpServers: MCP server management (nested under projects)
 * - projects: Project CRUD
 * - releases: Release management (nested under projects)
 * - repositories: Repository management (nested under projects)
 * - skills: Skill management (nested under projects)
 * - tasks: Task CRUD with dependencies and acceptance criteria
 * - users: User profile management
 */
export const api = {
  agents: new AgentsApi(config),
  epics: new EpicsApi(config),
  mcpServers: new McpServersApi(config),
  projects: new ProjectsApi(config),
  releases: new ReleasesApi(config),
  repositories: new RepositoriesApi(config),
  skills: new SkillsApi(config),
  tasks: new TasksApi(config),
  users: new UsersApi(config),
};

// Re-export types and APIs for direct usage if needed
export {
  Configuration,
  AgentsApi,
  EpicsApi,
  McpServersApi,
  ProjectsApi,
  ReleasesApi,
  RepositoriesApi,
  SkillsApi,
  TasksApi,
  UsersApi,
};

// Re-export all models
export * from "./generated/models";
