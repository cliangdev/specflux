/**
 * useProjectHealth Hook
 *
 * Provides project health status by checking system dependencies
 * and project configuration. Returns health indicator status
 * (healthy/warning/error) and detailed item statuses.
 *
 * Usage:
 * ```typescript
 * const { status, items, refresh, loading } = useProjectHealth(project);
 * // status: "healthy" | "warning" | "error"
 * // items: Array of health check items with status and messages
 * ```
 */

import { useState, useEffect, useCallback } from "react";
import {
  getProjectHealth,
  type ProjectHealthResult,
  type HealthStatus,
  type HealthCheckItem,
} from "../services/systemDeps";
import { type Project } from "../api";

export interface UseProjectHealthResult {
  /** Overall health status */
  status: HealthStatus;
  /** Detailed health check items */
  items: HealthCheckItem[];
  /** Whether health check is in progress */
  loading: boolean;
  /** Error message if health check failed */
  error: string | null;
  /** Manually trigger a health check refresh */
  refresh: () => Promise<void>;
}

/**
 * Hook to check and monitor project health status.
 *
 * @param project - The current project to check health for
 * @returns Health status, items, loading state, and refresh function
 */
export function useProjectHealth(
  project: Project | null,
): UseProjectHealthResult {
  const [status, setStatus] = useState<HealthStatus>("error");
  const [items, setItems] = useState<HealthCheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const hasLocalPath = Boolean(project?.localPath);
      const result: ProjectHealthResult = await getProjectHealth(hasLocalPath);

      setStatus(result.status);
      setItems(result.items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to check project health",
      );
      setStatus("error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [project?.localPath]);

  // Check health on mount and when project changes
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    status,
    items,
    loading,
    error,
    refresh: checkHealth,
  };
}

export default useProjectHealth;
