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
