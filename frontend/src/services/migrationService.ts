/**
 * Data Migration Service
 *
 * Migrates data from v1 (Node.js/SQLite) to v2 (Spring Boot/PostgreSQL) backend.
 * This is a one-time migration that copies:
 * - Projects
 * - Epics
 * - Tasks
 * - Releases
 *
 * Note: Local-only data (agents, skills, MCP servers, file changes) is NOT migrated
 * as those stay local.
 */

import { api } from "../api/client";
import { v2Api } from "../api/v2/client";
import { markMigrationComplete } from "../stores/backendStore";
import type { Project, Epic, Task, Release } from "../api/generated";
import type {
  Project as V2Project,
  Epic as V2Epic,
  Task as V2Task,
  Release as V2Release,
} from "../api/v2/generated";

/**
 * Fetch all tasks for a project, handling pagination.
 * The v1 API has a default limit of 20 and max of 100.
 */
async function fetchAllTasks(projectId: number): Promise<Task[]> {
  const allTasks: Task[] = [];
  let cursor: string | undefined;
  const limit = 100; // Max allowed by API

  do {
    const response = await api.tasks.listTasks({
      id: projectId,
      limit,
      cursor,
    });
    if (!response.success || !response.data) break;

    allTasks.push(...response.data);
    cursor = response.pagination?.nextCursor ?? undefined;
  } while (cursor);

  return allTasks;
}

/**
 * Migration progress callback
 */
export interface MigrationProgress {
  phase: "projects" | "epics" | "tasks" | "releases" | "complete";
  current: number;
  total: number;
  currentItem?: string;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  error?: string;
  stats: {
    projects: { migrated: number; failed: number };
    epics: { migrated: number; failed: number };
    tasks: { migrated: number; failed: number };
    releases: { migrated: number; failed: number };
  };
  errors: string[];
}

/**
 * Maps v1 project ID to v2 project ref (publicId)
 */
type ProjectIdMap = Map<number, string>;

/**
 * Maps v1 epic ID to v2 epic ref (publicId)
 */
type EpicIdMap = Map<number, string>;

/**
 * Maps v1 task ID to v2 task ref (publicId)
 */
type TaskIdMap = Map<number, string>;

/**
 * Maps v1 release ID to v2 release ref (publicId)
 */
type ReleaseIdMap = Map<number, string>;

/**
 * Migrate all data from v1 to v2.
 *
 * @param onProgress - Optional callback for progress updates
 * @returns Migration result with stats and any errors
 */
export async function migrateToV2(
  onProgress?: (progress: MigrationProgress) => void,
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    stats: {
      projects: { migrated: 0, failed: 0 },
      epics: { migrated: 0, failed: 0 },
      tasks: { migrated: 0, failed: 0 },
      releases: { migrated: 0, failed: 0 },
    },
    errors: [],
  };

  // Maps for tracking v1 -> v2 ID relationships
  const projectMap: ProjectIdMap = new Map();
  const epicMap: EpicIdMap = new Map();
  const taskMap: TaskIdMap = new Map();
  const releaseMap: ReleaseIdMap = new Map();

  try {
    // Phase 1: Migrate Projects
    const projectsResponse = await api.projects.listProjects();
    if (!projectsResponse.success || !projectsResponse.data) {
      throw new Error("Failed to fetch projects from v1");
    }
    const projects = projectsResponse.data;

    onProgress?.({ phase: "projects", current: 0, total: projects.length });

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      try {
        // Generate valid project key: uppercase alphanumeric, 2-10 chars
        const rawKey = project.projectId || project.name || `PROJ${project.id}`;
        const projectKey =
          rawKey
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .substring(0, 10) || `PROJ${project.id}`;

        const v2Project = await v2Api.projects.createProject({
          createProjectRequest: {
            projectKey,
            name: project.name,
            description: `Migrated from local project (path: ${project.localPath})`,
          },
        });
        projectMap.set(project.id, v2Project.publicId);
        result.stats.projects.migrated++;
      } catch (err) {
        result.stats.projects.failed++;
        result.errors.push(
          `Project "${project.name}": ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
      onProgress?.({
        phase: "projects",
        current: i + 1,
        total: projects.length,
        currentItem: project.name,
      });
    }

    // Phase 2: Migrate Releases (before epics since epics may reference releases)
    for (const [v1ProjectId, v2ProjectRef] of projectMap) {
      const releasesResponse = await api.releases.listReleases({
        id: v1ProjectId,
      });
      if (!releasesResponse.success || !releasesResponse.data) continue;

      const releases = releasesResponse.data;
      onProgress?.({ phase: "releases", current: 0, total: releases.length });

      for (let i = 0; i < releases.length; i++) {
        const release = releases[i];
        try {
          const v2Release = await v2Api.releases.createRelease({
            projectRef: v2ProjectRef,
            createReleaseRequest: {
              name: release.name,
              description: release.description || undefined,
              targetDate: release.targetDate
                ? new Date(release.targetDate)
                : undefined,
            },
          });
          releaseMap.set(release.id, v2Release.publicId);
          result.stats.releases.migrated++;
        } catch (err) {
          result.stats.releases.failed++;
          result.errors.push(
            `Release "${release.name}": ${err instanceof Error ? err.message : "Unknown error"}`,
          );
        }
        onProgress?.({
          phase: "releases",
          current: i + 1,
          total: releases.length,
          currentItem: release.name,
        });
      }
    }

    // Phase 3: Migrate Epics
    for (const [v1ProjectId, v2ProjectRef] of projectMap) {
      const epicsResponse = await api.epics.listEpics({ id: v1ProjectId });
      if (!epicsResponse.success || !epicsResponse.data) continue;

      const epics = epicsResponse.data;
      onProgress?.({ phase: "epics", current: 0, total: epics.length });

      for (let i = 0; i < epics.length; i++) {
        const epic = epics[i];
        try {
          const v2Epic = await v2Api.epics.createEpic({
            projectRef: v2ProjectRef,
            createEpicRequest: {
              title: epic.title,
              description: epic.description || undefined,
              targetDate: epic.targetDate
                ? new Date(epic.targetDate)
                : undefined,
            },
          });
          epicMap.set(epic.id, v2Epic.publicId);
          result.stats.epics.migrated++;
        } catch (err) {
          result.stats.epics.failed++;
          result.errors.push(
            `Epic "${epic.title}": ${err instanceof Error ? err.message : "Unknown error"}`,
          );
        }
        onProgress?.({
          phase: "epics",
          current: i + 1,
          total: epics.length,
          currentItem: epic.title,
        });
      }
    }

    // Phase 4: Migrate Tasks (with pagination to get all tasks)
    for (const [v1ProjectId, v2ProjectRef] of projectMap) {
      const tasks = await fetchAllTasks(v1ProjectId);
      if (tasks.length === 0) continue;
      onProgress?.({ phase: "tasks", current: 0, total: tasks.length });

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        try {
          // Find v2 epic ref if task has an epic
          const epicRef = task.epicId ? epicMap.get(task.epicId) : undefined;

          const v2Task = await v2Api.tasks.createTask({
            projectRef: v2ProjectRef,
            createTaskRequest: {
              title: task.title,
              description: task.description || undefined,
              epicRef: epicRef,
              requiresApproval: task.requiresApproval,
              estimatedDuration: task.estimatedDuration || undefined,
            },
          });
          taskMap.set(task.id, v2Task.publicId);
          result.stats.tasks.migrated++;
        } catch (err) {
          result.stats.tasks.failed++;
          result.errors.push(
            `Task "${task.title}": ${err instanceof Error ? err.message : "Unknown error"}`,
          );
        }
        onProgress?.({
          phase: "tasks",
          current: i + 1,
          total: tasks.length,
          currentItem: task.title,
        });
      }
    }

    // Only mark as complete if at least one project migrated successfully
    const totalMigrated =
      result.stats.projects.migrated +
      result.stats.epics.migrated +
      result.stats.tasks.migrated +
      result.stats.releases.migrated;

    const totalFailed =
      result.stats.projects.failed +
      result.stats.epics.failed +
      result.stats.tasks.failed +
      result.stats.releases.failed;

    if (result.stats.projects.migrated > 0) {
      onProgress?.({ phase: "complete", current: 1, total: 1 });
      result.success = true;
      markMigrationComplete();
    } else if (totalFailed > 0) {
      result.success = false;
      result.error = `Migration failed: ${totalFailed} items failed to migrate. Check errors for details.`;
    } else {
      result.success = true; // Nothing to migrate
      onProgress?.({ phase: "complete", current: 1, total: 1 });
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : "Migration failed";
    result.errors.push(result.error);
  }

  return result;
}

/**
 * Check if migration is needed.
 * Returns true if v2 is enabled, migration not complete, and v1 has data.
 */
export async function isMigrationNeeded(): Promise<boolean> {
  try {
    const projectsResponse = await api.projects.listProjects();
    if (!projectsResponse.success || !projectsResponse.data) {
      return false;
    }
    return projectsResponse.data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get migration preview - counts of items that will be migrated.
 */
export async function getMigrationPreview(): Promise<{
  projects: number;
  epics: number;
  tasks: number;
  releases: number;
}> {
  const preview = { projects: 0, epics: 0, tasks: 0, releases: 0 };

  try {
    const projectsResponse = await api.projects.listProjects();
    if (projectsResponse.success && projectsResponse.data) {
      preview.projects = projectsResponse.data.length;

      for (const project of projectsResponse.data) {
        const [epicsRes, allTasks, releasesRes] = await Promise.all([
          api.epics.listEpics({ id: project.id }),
          fetchAllTasks(project.id),
          api.releases.listReleases({ id: project.id }),
        ]);

        if (epicsRes.success && epicsRes.data) {
          preview.epics += epicsRes.data.length;
        }
        preview.tasks += allTasks.length;
        if (releasesRes.success && releasesRes.data) {
          preview.releases += releasesRes.data.length;
        }
      }
    }
  } catch {
    // Ignore errors in preview
  }

  return preview;
}
