import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useProject } from "../contexts";
import { api, type Epic, type Release } from "../api";
import { v2Api } from "../api/v2/client";
import { EpicStatusEnum } from "../api/generated";
import { EpicStatus as V2EpicStatus } from "../api/v2/generated";
import { EpicCard, EpicCreateModal } from "../components/epics";
import { EpicGraph } from "../components/roadmap";

type ViewMode = "cards" | "graph";

const VIEW_STORAGE_KEY = "specflux-epics-view";
const FILTERS_STORAGE_KEY = "specflux-epics-filters";

interface EpicsFilters {
  status: string;
  release: string;
  q: string;
}

function loadFilters(): EpicsFilters {
  try {
    const stored = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        status: parsed.status ?? "",
        release: parsed.release ?? "",
        q: parsed.q ?? "",
      };
    }
  } catch {
    // Invalid JSON, use defaults
  }
  return { status: "", release: "", q: "" };
}

function saveFilters(filters: EpicsFilters): void {
  localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export default function EpicsPage() {
  const { currentProject, usingV2, getProjectRef } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const [epics, setEpics] = useState<Epic[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    return saved === "cards" || saved === "graph" ? saved : "cards";
  });

  // Load initial filters from localStorage
  const [initialFilters] = useState(loadFilters);

  // Filters - initialize from URL params first, then localStorage
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") || initialFilters.status,
  );
  const [releaseFilter, setReleaseFilter] = useState(
    () => searchParams.get("release") || initialFilters.release,
  );
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") || initialFilters.q,
  );

  const clearFilters = () => {
    setStatusFilter("");
    setReleaseFilter("");
    setSearchQuery("");
  };

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Persist filters to localStorage
  useEffect(() => {
    saveFilters({
      status: statusFilter,
      release: releaseFilter,
      q: searchQuery,
    });
  }, [statusFilter, releaseFilter, searchQuery]);

  // Sync URL params with filter state (for shareability)
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (statusFilter) newParams.set("status", statusFilter);
    if (releaseFilter) newParams.set("release", releaseFilter);
    if (searchQuery) newParams.set("q", searchQuery);
    setSearchParams(newParams, { replace: true });
  }, [statusFilter, releaseFilter, searchQuery, setSearchParams]);

  const fetchReleases = useCallback(async () => {
    if (!currentProject) return;
    try {
      if (usingV2) {
        const projectRef = getProjectRef();
        if (!projectRef) return;
        console.log("[EpicsPage] Fetching releases from v2 API");
        const response = await v2Api.releases.listReleases({ projectRef });
        // Convert v2 releases to v1 format
        const v2Releases = response.data ?? [];
        const convertedReleases: Release[] = v2Releases.map((r) => ({
          id: 0, // v2 uses publicId
          publicId: r.publicId,
          name: r.name,
          description: r.description ?? null,
          status: r.status.toLowerCase() as
            | "planned"
            | "in_progress"
            | "released",
          targetDate: r.targetDate ?? null,
          projectId: 0,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          epicCount: (r as { epicCount?: number }).epicCount,
          progressPercentage: (r as { progressPercentage?: number })
            .progressPercentage,
        }));
        setReleases(convertedReleases);
      } else {
        const response = await api.releases.listReleases({
          id: currentProject.id,
        });
        setReleases(response.data ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch releases:", err);
    }
  }, [currentProject, usingV2, getProjectRef]);

  const fetchEpics = useCallback(async () => {
    if (!currentProject) {
      setEpics([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (usingV2) {
        const projectRef = getProjectRef();
        if (!projectRef) {
          setError("No project selected");
          setLoading(false);
          return;
        }
        console.log(
          "[EpicsPage] Fetching epics from v2 API, projectRef:",
          projectRef,
        );
        // Map status filter to v2 format
        let v2Status: V2EpicStatus | undefined;
        if (statusFilter) {
          v2Status = statusFilter.toUpperCase() as V2EpicStatus;
        }
        const response = await v2Api.epics.listEpics({
          projectRef,
          status: v2Status,
          limit: 100,
        });
        console.log("[EpicsPage] v2 epics response:", response);
        // Convert v2 epics to v1 format
        const v2Epics = response.data ?? [];
        console.log("[EpicsPage] v2 epics count:", v2Epics.length);
        // Use type assertion to allow string[] dependsOn for v2 (v1 uses number[])
        const convertedEpics = v2Epics.map((e) => ({
          id: 0, // v2 uses publicId
          publicId: e.publicId,
          displayKey: e.displayKey,
          title: e.title,
          description: e.description ?? null,
          status: e.status.toLowerCase() as "planning" | "active" | "completed",
          targetDate: e.targetDate ?? null,
          projectId: 0,
          releaseId: null, // v1 field - not used for v2
          releasePublicId: e.releaseId, // v2 uses publicId for release
          createdByUserId: 0, // Required field
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
          dependsOn: e.dependsOn ?? [], // Include dependencies for graph view (string[] for v2)
          taskStats: e.taskStats, // Include task stats
          progressPercentage: e.progressPercentage, // Include progress percentage
          phase: e.phase, // Include phase for dependency depth
          prdFilePath: e.prdFilePath, // Include PRD file path
          epicFilePath: e.epicFilePath, // Include epic file path
        })) as unknown as Epic[];
        setEpics(convertedEpics);
      } else {
        const response = await api.epics.listEpics({
          id: currentProject.id,
          status: (statusFilter || undefined) as EpicStatusEnum | undefined,
        });
        setEpics(response.data ?? []);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load epics";
      setError(message);
      console.error("Failed to fetch epics:", err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, statusFilter, usingV2, getProjectRef]);

  useEffect(() => {
    fetchReleases();
    fetchEpics();
  }, [fetchReleases, fetchEpics]);

  // Filter epics by search query and release (client-side)
  const filteredEpics = epics.filter((epic) => {
    // Release filter - handle both v1 (numeric) and v2 (publicId)
    if (releaseFilter) {
      const epicWithPublicId = epic as Epic & { releasePublicId?: string };
      if (releaseFilter === "unassigned") {
        // For unassigned filter, check both releaseId and releasePublicId
        if (epic.releaseId || epicWithPublicId.releasePublicId) return false;
      } else {
        // For v2, compare releasePublicId; for v1, compare numeric releaseId
        const matchesV2 = epicWithPublicId.releasePublicId === releaseFilter;
        const matchesV1 = epic.releaseId === Number(releaseFilter);
        if (!matchesV2 && !matchesV1) return false;
      }
    }

    // Search filter - handle both v1 (id) and v2 (displayKey/publicId)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = epic.title.toLowerCase().includes(query);
      const matchesDescription = epic.description
        ?.toLowerCase()
        .includes(query);
      const epicWithV2 = epic as Epic & {
        displayKey?: string;
        publicId?: string;
      };
      const epicRef =
        epicWithV2.displayKey || epicWithV2.publicId || epic.id.toString();
      const matchesRef = epicRef.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDescription && !matchesRef) return false;
    }

    return true;
  });

  const hasActiveFilters =
    statusFilter !== "" || releaseFilter !== "" || searchQuery !== "";

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <div className="text-system-500 dark:text-system-400 text-lg">
          No project selected
        </div>
        <p className="text-system-400 dark:text-system-500 mt-2">
          Select a project from the dropdown above
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h1 className="text-2xl font-semibold text-system-900 dark:text-white mr-4">
          Epics
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Release filter */}
          <select
            value={releaseFilter}
            onChange={(e) => setReleaseFilter(e.target.value)}
            className="select w-[160px]"
          >
            <option value="">All Releases</option>
            <option value="unassigned">Unassigned</option>
            {releases.map((release) => (
              <option
                key={
                  (release as Release & { publicId?: string }).publicId ||
                  release.id
                }
                value={
                  (release as Release & { publicId?: string }).publicId ||
                  release.id
                }
              >
                {release.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select w-[140px]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Search input */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-system-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search epics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-[200px]"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-system-100 dark:bg-system-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === "cards"
                  ? "bg-white dark:bg-system-700 text-system-900 dark:text-white shadow-sm"
                  : "text-system-600 dark:text-system-400 hover:text-system-900 dark:hover:text-white"
              }`}
              title="Card view"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              Cards
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === "graph"
                  ? "bg-white dark:bg-system-700 text-system-900 dark:text-white shadow-sm"
                  : "text-system-600 dark:text-system-400 hover:text-system-900 dark:hover:text-white"
              }`}
              title="Dependency graph view"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Graph
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchEpics}
            className="btn btn-ghost"
            title="Refresh"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Create button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Epic
          </button>
        </div>
      </div>

      {/* Filter summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mb-4 text-sm text-system-500 dark:text-system-400 shrink-0">
          <span>
            Showing {filteredEpics.length} of {epics.length} epics
          </span>
          <button
            onClick={clearFilters}
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg
            className="animate-spin w-8 h-8 text-brand-500"
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
          <p className="text-system-500 mt-2">{error}</p>
          <button onClick={fetchEpics} className="mt-4 btn btn-primary">
            Try Again
          </button>
        </div>
      ) : filteredEpics.length === 0 ? (
        <div className="text-center py-12 card">
          <svg
            className="mx-auto h-12 w-12 text-system-400 dark:text-system-500"
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
          <h3 className="mt-4 text-lg font-medium text-system-700 dark:text-system-300">
            No epics
          </h3>
          <p className="mt-2 text-system-500">
            {hasActiveFilters
              ? "No epics match the selected filters."
              : "Get started by creating your first epic."}
          </p>
        </div>
      ) : viewMode === "graph" ? (
        <EpicGraph
          key={`${releaseFilter}-${statusFilter}-${searchQuery}`}
          epics={filteredEpics}
          className="flex-1 min-h-0"
        />
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
