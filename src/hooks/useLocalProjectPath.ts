/**
 * Hook for managing project local paths
 *
 * This hook provides access to the local filesystem path for a project,
 * stored in localStorage instead of the backend. This allows multiple
 * users to work on the same project from different machines with
 * different local paths.
 */

import { useState, useEffect, useCallback } from "react";
import { useProject } from "../contexts/ProjectContext";
import {
  getLocalProjectPath,
  setLocalProjectPath,
  migrateProjectLocalPath,
  getFullRepositoryPath,
} from "../services/localProjectSettings";

interface UseLocalProjectPathResult {
  /** The local filesystem path for the current project */
  localPath: string | null;
  /** Whether the local path is configured */
  isConfigured: boolean;
  /** Update the local path for the current project */
  setLocalPath: (path: string) => void;
  /** Get the full path for a repository (localPath + repoPath) */
  getRepoFullPath: (repoRelativePath: string) => string | null;
}

/**
 * Hook to access and manage the current project's local path
 *
 * On first load, if the project has a localPath from the backend but
 * no local setting, it will be migrated to local storage.
 */
export function useLocalProjectPath(): UseLocalProjectPathResult {
  const { currentProject } = useProject();
  const [localPath, setLocalPathState] = useState<string | null>(null);

  // Load local path when project changes
  useEffect(() => {
    if (!currentProject?.id) {
      setLocalPathState(null);
      return;
    }

    // Check if we have a local setting
    let storedPath = getLocalProjectPath(currentProject.id);

    // If not, migrate from backend if available
    if (!storedPath && currentProject.localPath) {
      migrateProjectLocalPath(currentProject.id, currentProject.localPath);
      storedPath = currentProject.localPath;
    }

    setLocalPathState(storedPath);
  }, [currentProject?.id, currentProject?.localPath]);

  // Update local path
  const setLocalPath = useCallback(
    (path: string) => {
      if (!currentProject?.id) return;
      setLocalProjectPath(currentProject.id, path);
      setLocalPathState(path);
    },
    [currentProject?.id]
  );

  // Get full repository path
  const getRepoFullPath = useCallback(
    (repoRelativePath: string): string | null => {
      if (!currentProject?.id) return null;
      return getFullRepositoryPath(currentProject.id, repoRelativePath);
    },
    [currentProject?.id]
  );

  return {
    localPath,
    isConfigured: localPath !== null,
    setLocalPath,
    getRepoFullPath,
  };
}

/**
 * Hook to get the local path for a specific project (by ID)
 * Useful when you need the path for a project other than the current one
 */
export function useProjectLocalPath(projectId: string | null): string | null {
  const [localPath, setLocalPath] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLocalPath(null);
      return;
    }
    setLocalPath(getLocalProjectPath(projectId));
  }, [projectId]);

  return localPath;
}
