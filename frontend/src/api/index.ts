/**
 * API Module
 *
 * Re-exports the API client and commonly used types.
 */

// API client
export { api, setUserId, getUserId } from "./client";

// API classes for custom configuration
export {
  Configuration,
  EpicsApi,
  FilesApi,
  HealthApi,
  NotificationsApi,
  ProjectsApi,
  ReleasesApi,
  RepositoriesApi,
  TasksApi,
  UsersApi,
} from "./client";

// Domain models
export type {
  Project,
  Epic,
  Task,
  Repository,
  Notification,
  User,
  ProjectConfig,
  ProjectStats,
  DashboardResponse,
  EpicProgress,
  TaskDependency,
  TaskDiff,
  FileChange,
  AgentStatus,
  TerminalOutput,
  Pagination,
  ApproveAndPRResult,
  // Release types
  Release,
  ReleaseWithEpics,
  ReleasePhase,
  // File tracking types
  GetTaskFileChanges200ResponseData as TaskFileChanges,
  GetTaskFileChanges200ResponseDataChangesInner as TrackedFileChange,
  GetTaskFileChanges200ResponseDataSummary as FileChangeSummary,
  // Agent types
  Agent,
  Skill,
  McpServer,
} from "./generated";

// Request types
export type {
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateEpicRequest,
  UpdateEpicRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateRepositoryRequest,
  UpdateRepositoryRequest,
  CreateReleaseRequest,
  UpdateReleaseRequest,
  ReviewRequest,
  UpdateUserRequest,
} from "./generated";

// Error type
export type { ModelError } from "./generated";

// Enum types
export {
  ControlTaskAgentRequestActionEnum,
  AgentStatusStatusEnum,
} from "./generated";

// Runtime error class (for error handling)
export { ResponseError } from "./generated/runtime";

/**
 * Extract a user-friendly error message from an API error.
 * Handles ResponseError from the generated client which wraps fetch Response objects.
 *
 * @param error - The error caught from an API call
 * @param fallback - Fallback message if error cannot be parsed
 * @returns A user-friendly error message
 */
export async function getApiErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred",
): Promise<string> {
  // Import ResponseError dynamically to avoid circular dependencies
  const { ResponseError } = await import("./generated/runtime");

  if (error instanceof ResponseError) {
    try {
      // Clone the response to read the body (can only be read once)
      const body = await error.response.clone().json();
      if (body && typeof body.error === "string") {
        return body.error;
      }
    } catch {
      // If we can't parse the response, fall through to default handling
    }
    // Use status text as a fallback
    return error.response.statusText || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
