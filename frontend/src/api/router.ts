/**
 * API Router
 *
 * Provides access to both v1 (Node.js/SQLite) and v2 (Spring Boot/PostgreSQL) APIs.
 *
 * The v1 and v2 APIs have different type signatures and cannot be unified at the type level.
 * Components should explicitly choose which API to use based on the backend settings.
 *
 * Usage:
 * ```typescript
 * import { api, v2Api, isV2Enabled } from '../api';
 *
 * // For local-only features, always use v1
 * const agents = await api.agents.listAgents({ projectId: 1 });
 *
 * // For cloud features, check settings
 * if (isV2Enabled()) {
 *   const projects = await v2Api.projects.listProjects({});
 * } else {
 *   const projects = await api.projects.listProjects();
 * }
 * ```
 */

// Re-export v1 API as the default api
export { api, setUserId, getUserId } from "./client";

// Export v2 API separately
export { v2Api } from "./v2/client";

// Export backend settings utilities
export {
  isV2Enabled,
  enableV2,
  disableV2,
  getBackendSettings,
  updateBackendSettings,
  markMigrationComplete,
  resetMigration,
  subscribeToBackendSettings,
  resetBackendSettings,
  type BackendSettings,
} from "../stores/backendStore";

// Export v2 response adapter utilities
export {
  wrapV2Response,
  wrapV2VoidResponse,
  wrapV2PaginatedResponse,
  type V1Response,
  type V1PaginatedResponse,
} from "./adapters/v2Adapter";
