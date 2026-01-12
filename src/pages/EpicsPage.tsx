import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useProject } from "../contexts";
import { api, type Epic, type Prd, EpicStatus } from "../api";
import { EpicCard, EpicCreateModal } from "../components/epics";
import { usePageContext } from "../hooks/usePageContext";

const FILTERS_STORAGE_KEY = "specflux-epics-filters";

interface EpicsFilters {
  status: string;
  prd: string;
  projectId?: string; // Track which project these filters are for
}

function loadFilters(): EpicsFilters & { projectId?: string } {
  const defaults = { status: "", prd: "" };
  try {
    const stored = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only restore project-specific filters if we have a stored projectId
      // This ensures we don't use stale filters from before projectId tracking was added
      if (parsed.projectId) {
        return {
          status: parsed.status ?? "",
          prd: parsed.prd ?? "",
          projectId: parsed.projectId,
        };
      } else {
        // No projectId stored - only restore status (project-agnostic)
        return {
          status: parsed.status ?? "",
          prd: "",
          projectId: undefined,
        };
      }
    }
  } catch {
    // Invalid JSON, use defaults
  }
  return defaults;
}

function saveFilters(filters: EpicsFilters, projectId?: string): void {
  localStorage.setItem(
    FILTERS_STORAGE_KEY,
    JSON.stringify({ ...filters, projectId })
  );
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: EpicStatus.Planning, label: "Planning" },
  { value: EpicStatus.InProgress, label: "In Progress" },
  { value: EpicStatus.Completed, label: "Completed" },
];

export default function EpicsPage() {
  const { currentProject, getProjectRef } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const [epics, setEpics] = useState<Epic[]>([]);
  const [prds, setPrds] = useState<Prd[]>([]);
  const [loading, setLoading] = useState(true);

  // Set page context for terminal suggested commands
  usePageContext({ type: "epics" });
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load initial filters from localStorage
  const [initialFilters] = useState(loadFilters);

  // Filters - initialize from URL params first, then localStorage
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") || initialFilters.status,
  );
  const [prdFilter, setPrdFilter] = useState(
    () => searchParams.get("prd") || initialFilters.prd,
  );

  // Clear stale project-specific filters when project loads and doesn't match stored projectId
  const staleFiltersCleared = useRef(false);
  useEffect(() => {
    if (!staleFiltersCleared.current && currentProject?.id) {
      // Check if stored filters are for a different project
      if (initialFilters.projectId && initialFilters.projectId !== currentProject.id) {
        // Filters are from a different project - clear them
        setPrdFilter("");
      }
      staleFiltersCleared.current = true;
    }
  }, [currentProject?.id, initialFilters.projectId]);

  // Persist filters to localStorage (include project ID to detect stale filters later)
  useEffect(() => {
    saveFilters(
      {
        status: statusFilter,
        prd: prdFilter,
      },
      currentProject?.id
    );
  }, [statusFilter, prdFilter, currentProject?.id]);

  // Sync URL params with filter state (for shareability)
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (statusFilter) newParams.set("status", statusFilter);
    if (prdFilter) newParams.set("prd", prdFilter);
    setSearchParams(newParams, { replace: true });
  }, [statusFilter, prdFilter, setSearchParams]);

  const fetchPrds = useCallback(async () => {
    if (!currentProject) return;
    const projectRef = getProjectRef();
    if (!projectRef) return;

    try {
      const response = await api.prds.listPrds({ projectRef, limit: 100 });
      setPrds(response.data ?? []);
    } catch (err) {
      console.error("Failed to fetch PRDs:", err);
    }
  }, [currentProject, getProjectRef]);

  const fetchEpics = useCallback(async () => {
    if (!currentProject) {
      setEpics([]);
      setLoading(false);
      return;
    }

    const projectRef = getProjectRef();
    if (!projectRef) {
      setError("No project selected");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Status filter is already in UPPER_CASE format from EpicStatus enum
      const epicStatus = statusFilter as EpicStatus | undefined;
      const response = await api.epics.listEpics({
        projectRef,
        status: epicStatus,
        prdRef: prdFilter || undefined,
        limit: 100,
      });
      // Convert v2 epics to v1 format
      const v2Epics = response.data ?? [];
      // Use type assertion to allow string[] dependsOn for v2 (v1 uses number[])
      const convertedEpics = v2Epics.map((e) => ({
        id: 0, // v2 uses id as string
        publicId: e.id,
        displayKey: e.displayKey,
        title: e.title,
        description: e.description ?? null,
        status: e.status, // Keep UPPER_CASE status from v2 API
        targetDate: e.targetDate ?? null,
        projectId: 0,
        createdByUserId: 0, // Required field
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        dependsOn: e.dependsOn ?? [], // Include dependencies (string[] for v2)
        taskStats: e.taskStats, // Include task stats
        progressPercentage: e.progressPercentage, // Include progress percentage
        phase: e.phase, // Include phase for dependency depth
        prdFilePath: e.prdFilePath, // Include PRD file path
        epicFilePath: e.epicFilePath, // Include epic file path
      })) as unknown as Epic[];
      setEpics(convertedEpics);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load epics";
      setError(message);
      console.error("Failed to fetch epics:", err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, statusFilter, prdFilter, getProjectRef]);

  // Track previous project ID to detect actual project changes (not initial mount)
  const prevProjectIdRef = useRef<string | undefined>(currentProject?.id);

  // Clear project-specific filters when user switches to a different project
  useEffect(() => {
    const prevProjectId = prevProjectIdRef.current;
    const currentProjectId = currentProject?.id;

    // Only reset filters if project actually changed (both must be defined for a real switch)
    if (
      prevProjectId !== undefined &&
      currentProjectId !== undefined &&
      prevProjectId !== currentProjectId
    ) {
      setPrdFilter("");
    }

    prevProjectIdRef.current = currentProjectId;
  }, [currentProject?.id]);

  useEffect(() => {
    fetchPrds();
    fetchEpics();
  }, [fetchPrds, fetchEpics]);

  const filteredEpics = epics;

  const hasActiveFilters =
    statusFilter !== "" || prdFilter !== "";

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <div className="text-surface-500 dark:text-surface-400 text-lg">
          No project selected
        </div>
        <p className="text-surface-400 dark:text-surface-500 mt-2">
          Select a project from the dropdown above
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
          Epics
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={prdFilter}
            onChange={(e) => setPrdFilter(e.target.value)}
            className="select min-w-[120px] max-w-[200px]"
          >
            <option value="">All PRDs</option>
            {prds.map((prd) => (
              <option key={prd.id} value={prd.id}>
                {prd.displayKey}: {prd.title}
              </option>
            ))}
          </select>

          {/* Refresh button */}
          <button onClick={fetchEpics} className="btn btn-ghost" title="Refresh">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Create button */}
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Epic
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg
            className="animate-spin w-8 h-8 text-accent-500"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-500 dark:text-red-400 text-lg">
            Error loading epics
          </div>
          <p className="text-surface-500 mt-2">{error}</p>
          <button onClick={fetchEpics} className="mt-4 btn btn-primary">
            Try Again
          </button>
        </div>
      ) : filteredEpics.length === 0 ? (
        <div className="text-center py-12 card">
          <svg
            className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-surface-700 dark:text-surface-300">
            No epics
          </h3>
          <p className="mt-2 text-surface-500">
            {hasActiveFilters
              ? "No epics match the selected filters."
              : "Get started by creating your first epic."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-auto">
          {filteredEpics.map((epic) => (
            <EpicCard
              key={(epic as Epic & { publicId?: string }).publicId || epic.id}
              epic={epic}
            />
          ))}
        </div>
      )}

      {/* Create Epic Modal */}
      {showCreateModal && currentProject && (
        <EpicCreateModal
          projectId={currentProject.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchEpics}
        />
      )}
    </div>
  );
}
