/**
 * useBackendApi Hook
 *
 * Provides unified API access that works with both v1 (Node.js) and v2 (Spring Boot) backends.
 * Automatically selects the appropriate backend based on settings and wraps responses
 * to a consistent format.
 *
 * Usage:
 * ```typescript
 * const { useV2, projectRef } = useBackendApi();
 *
 * // For listing projects
 * if (useV2) {
 *   const response = await wrapV2PaginatedResponse(
 *     v2Api.projects.listProjects({})
 *   );
 * } else {
 *   const response = await api.projects.listProjects();
 * }
 * ```
 */

import { useState, useEffect, useCallback } from "react";
import {
  getBackendSettings,
  subscribeToBackendSettings,
  type BackendSettings,
} from "../stores/backendStore";

export interface BackendApiState {
  /** Whether v2 (Spring Boot) backend is currently enabled */
  useV2: boolean;
  /** Current project reference for v2 API (publicId) - needs to be set by component */
  projectRef: string | null;
  /** Set the current project reference for v2 API calls */
  setProjectRef: (ref: string | null) => void;
  /** Full backend settings */
  settings: BackendSettings;
  /** Whether migration has been completed */
  migrationComplete: boolean;
}

/**
 * Hook to get current backend API state and settings.
 * Automatically updates when settings change.
 */
export function useBackendApi(): BackendApiState {
  const [settings, setSettings] = useState<BackendSettings>(getBackendSettings);
  const [projectRef, setProjectRef] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to settings changes
    const unsubscribe = subscribeToBackendSettings((newSettings) => {
      setSettings(newSettings);
    });

    return unsubscribe;
  }, []);

  return {
    useV2: settings.v2Enabled && settings.migrationComplete,
    projectRef,
    setProjectRef,
    settings,
    migrationComplete: settings.migrationComplete,
  };
}

/**
 * Map v1 project ID to v2 project ref.
 * For now, this requires looking up the project or using a cached mapping.
 * Returns null if no mapping exists.
 */
export function useProjectRefMapping(): {
  getV2ProjectRef: (v1ProjectId: number) => Promise<string | null>;
  v2ProjectRefCache: Map<number, string>;
} {
  const [cache] = useState(() => new Map<number, string>());

  const getV2ProjectRef = useCallback(
    async (v1ProjectId: number): Promise<string | null> => {
      // Check cache first
      if (cache.has(v1ProjectId)) {
        return cache.get(v1ProjectId)!;
      }

      // For now, we'll need to fetch from v2 API and match by name
      // This is a limitation until we implement proper ID mapping
      // In practice, most use cases will have a single project
      return null;
    },
    [cache],
  );

  return { getV2ProjectRef, v2ProjectRefCache: cache };
}

export default useBackendApi;
