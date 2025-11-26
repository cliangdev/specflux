import { useState, useEffect, useCallback, useMemo } from "react";
import { useProject } from "../contexts";
import { useSearchParams } from "react-router-dom";
import { api, type Release, type ReleaseWithEpics, type Epic } from "../api";
import { PhaseSection } from "../components/roadmap";
import { EpicEditModal, EpicCreateModal } from "../components/epics";
import { ReleaseCreateModal } from "../components/releases";

function formatDate(date: Date | null | undefined): string {
  if (!date) return "No target date";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getReleaseStatusBadge(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case "released":
      return {
        label: "Released",
        className: "bg-semantic-success/20 text-semantic-success",
      };
    case "in_progress":
      return {
        label: "In Progress",
        className: "bg-brand-500/20 text-brand-600 dark:text-brand-400",
      };
    default:
      return {
        label: "Planned",
        className:
          "bg-system-200 dark:bg-system-700 text-system-600 dark:text-system-400",
      };
  }
}

// Loading skeleton for roadmap
function RoadmapSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Release header skeleton */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-7 w-32 bg-system-200 dark:bg-system-700 rounded" />
              <div className="h-5 w-16 bg-system-200 dark:bg-system-700 rounded-full" />
            </div>
            <div className="h-4 w-48 bg-system-200 dark:bg-system-700 rounded mt-2" />
          </div>
          <div className="text-right">
            <div className="h-4 w-20 bg-system-200 dark:bg-system-700 rounded mb-1" />
            <div className="h-5 w-24 bg-system-200 dark:bg-system-700 rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-16 bg-system-200 dark:bg-system-700 rounded" />
            <div className="h-4 w-20 bg-system-200 dark:bg-system-700 rounded" />
          </div>
          <div className="h-2 bg-system-200 dark:bg-system-700 rounded-full" />
        </div>
      </div>

      {/* Phase sections skeleton */}
      {[1, 2].map((i) => (
        <div key={i} className="mb-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-system-50 dark:bg-system-800">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-system-200 dark:bg-system-700 rounded" />
              <div className="h-6 w-20 bg-system-200 dark:bg-system-700 rounded-full" />
              <div className="h-4 w-16 bg-system-200 dark:bg-system-700 rounded" />
            </div>
            <div className="h-4 w-24 bg-system-200 dark:bg-system-700 rounded" />
          </div>
          <div className="mt-3 space-y-2 pl-7">
            {[1, 2].map((j) => (
              <div key={j} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-4 h-4 bg-system-200 dark:bg-system-700 rounded mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-4 w-8 bg-system-200 dark:bg-system-700 rounded" />
                        <div className="h-5 w-48 bg-system-200 dark:bg-system-700 rounded" />
                      </div>
                      <div className="h-4 w-64 bg-system-200 dark:bg-system-700 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-16 bg-system-200 dark:bg-system-700 rounded" />
                    <div className="h-5 w-16 bg-system-200 dark:bg-system-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ReleaseHeaderProps {
  release: Release;
}

function ReleaseHeader({ release }: ReleaseHeaderProps) {
  const statusBadge = getReleaseStatusBadge(release.status);
  const progress = release.progressPercentage ?? 0;

  return (
    <div className="card mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-system-900 dark:text-white">
              {release.name}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>
          {release.description && (
            <p className="text-system-600 dark:text-system-400 mt-1">
              {release.description}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm text-system-500 dark:text-system-400">
            Target Date
          </div>
          <div className="font-medium text-system-900 dark:text-white">
            {formatDate(release.targetDate)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-system-600 dark:text-system-400">
            {release.epicCount ?? 0} epics
          </span>
          <span className="font-medium text-system-900 dark:text-white">
            {progress}% complete
          </span>
        </div>
        <div className="h-2 bg-system-200 dark:bg-system-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const { currentProject } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const [releases, setReleases] = useState<Release[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState<number | null>(
    null,
  );
  const [roadmapData, setRoadmapData] = useState<ReleaseWithEpics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [showCreateRelease, setShowCreateRelease] = useState(false);
  const [showCreateEpic, setShowCreateEpic] = useState(false);

  // Filter state from URL params
  const statusFilter = searchParams.get("status") || "all";
  const searchQuery = searchParams.get("q") || "";

  const setStatusFilter = (status: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (status === "all") {
      newParams.delete("status");
    } else {
      newParams.set("status", status);
    }
    setSearchParams(newParams);
  };

  const setSearchQuery = (query: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (!query) {
      newParams.delete("q");
    } else {
      newParams.set("q", query);
    }
    setSearchParams(newParams);
  };

  // Fetch all releases for the project
  const fetchReleases = useCallback(async () => {
    if (!currentProject) {
      setReleases([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.releases.listReleases({
        id: currentProject.id,
      });
      const releaseList = response.data ?? [];
      setReleases(releaseList);

      // Auto-select first release if none selected
      if (releaseList.length > 0 && !selectedReleaseId) {
        setSelectedReleaseId(releaseList[0].id);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load releases";
      setError(message);
      console.error("Failed to fetch releases:", err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, selectedReleaseId]);

  // Fetch roadmap data for selected release
  const fetchRoadmap = useCallback(async () => {
    if (!selectedReleaseId) {
      setRoadmapData(null);
      return;
    }

    try {
      setError(null);
      const response = await api.releases.getReleaseRoadmap({
        id: selectedReleaseId,
      });
      setRoadmapData(response.data ?? null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load roadmap";
      setError(message);
      console.error("Failed to fetch roadmap:", err);
    }
  }, [selectedReleaseId]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  useEffect(() => {
    if (selectedReleaseId) {
      fetchRoadmap();
    }
  }, [selectedReleaseId, fetchRoadmap]);

  const handleRefresh = () => {
    fetchReleases();
    fetchRoadmap();
  };

  // Filter epics based on status and search query
  const filteredEpics = useMemo(() => {
    if (!roadmapData?.epics) return [];

    return roadmapData.epics.filter((epic) => {
      // Status filter
      if (statusFilter !== "all" && epic.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = epic.title.toLowerCase().includes(query);
        const matchesDescription = epic.description
          ?.toLowerCase()
          .includes(query);
        const matchesId = epic.id.toString().includes(query);
        if (!matchesTitle && !matchesDescription && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [roadmapData?.epics, statusFilter, searchQuery]);

  // Compute filtered phases (only phases containing filtered epics)
  const filteredPhases = useMemo(() => {
    if (!roadmapData?.phases) return [];

    const filteredEpicIds = new Set(filteredEpics.map((e) => e.id));

    return roadmapData.phases
      .map((phase) => ({
        ...phase,
        epicIds: phase.epicIds.filter((id) => filteredEpicIds.has(id)),
      }))
      .filter((phase) => phase.epicIds.length > 0);
  }, [roadmapData?.phases, filteredEpics]);

  const totalEpicsCount = roadmapData?.epics.length ?? 0;
  const filteredEpicsCount = filteredEpics.length;
  const hasActiveFilters = statusFilter !== "all" || searchQuery !== "";

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-system-900 dark:text-white">
          Roadmap
        </h1>
        <div className="flex items-center gap-3">
          {/* Release selector */}
          {releases.length > 0 && (
            <select
              value={selectedReleaseId ?? ""}
              onChange={(e) =>
                setSelectedReleaseId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className="select w-[200px]"
            >
              {releases.map((release) => (
                <option key={release.id} value={release.id}>
                  {release.name}
                </option>
              ))}
            </select>
          )}

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
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

          {/* Create Release button */}
          <button
            onClick={() => setShowCreateRelease(true)}
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
            Create Release
          </button>
        </div>
      </div>

      {loading ? (
        <RoadmapSkeleton />
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-500 dark:text-red-400 text-lg">
            Error loading roadmap
          </div>
          <p className="text-system-500 mt-2">{error}</p>
          <button onClick={handleRefresh} className="mt-4 btn btn-primary">
            Try Again
          </button>
        </div>
      ) : releases.length === 0 ? (
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
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-system-700 dark:text-system-300">
            No releases yet
          </h3>
          <p className="mt-2 text-system-500">
            Create your first release to start planning your roadmap.
          </p>
          <button
            onClick={() => setShowCreateRelease(true)}
            className="mt-4 btn btn-primary"
          >
            <svg
              className="w-4 h-4 mr-2"
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
            Create Release
          </button>
        </div>
      ) : roadmapData ? (
        <>
          <ReleaseHeader release={roadmapData.release} />

          {/* Filter controls */}
          {totalEpicsCount > 0 && (
            <div className="flex items-center gap-4 mb-4">
              {/* Search input */}
              <div className="relative flex-1 max-w-xs">
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
                  className="input pl-10 w-full"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select"
              >
                <option value="all">All Statuses</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>

              {/* Result count */}
              <div className="text-sm text-system-500 dark:text-system-400">
                {hasActiveFilters ? (
                  <>
                    Showing {filteredEpicsCount} of {totalEpicsCount} epics
                    <button
                      onClick={() => {
                        setSearchParams(new URLSearchParams());
                      }}
                      className="ml-2 text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Clear filters
                    </button>
                  </>
                ) : (
                  <>{totalEpicsCount} epics</>
                )}
              </div>
            </div>
          )}

          {roadmapData.phases.length === 0 ? (
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
                No epics in this release
              </h3>
              <p className="mt-2 text-system-500">
                Add epics to start building your roadmap.
              </p>
              <button
                onClick={() => setShowCreateEpic(true)}
                className="mt-4 btn btn-primary"
              >
                <svg
                  className="w-4 h-4 mr-2"
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
          ) : filteredPhases.length === 0 && hasActiveFilters ? (
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-system-700 dark:text-system-300">
                No epics match your filters
              </h3>
              <p className="mt-2 text-system-500">
                Try adjusting your search or filters.
              </p>
              <button
                onClick={() => setSearchParams(new URLSearchParams())}
                className="mt-4 btn btn-ghost"
              >
                Clear filters
              </button>
            </div>
          ) : (
            filteredPhases
              .sort((a, b) => a.phaseNumber - b.phaseNumber)
              .map((phase) => {
                // Filter epics for this phase
                const phaseEpics = filteredEpics.filter((e) =>
                  phase.epicIds.includes(e.id),
                );

                return (
                  <PhaseSection
                    key={phase.phaseNumber}
                    phaseNumber={phase.phaseNumber}
                    status={
                      phase.status as
                        | "ready"
                        | "in_progress"
                        | "blocked"
                        | "completed"
                    }
                    epics={phaseEpics}
                    allEpics={roadmapData.epics}
                    completedCount={phase.completedCount}
                    totalCount={phase.totalCount}
                    onEditEpic={setEditingEpic}
                  />
                );
              })
          )}

          {/* Epic Edit Modal */}
          {editingEpic && currentProject && (
            <EpicEditModal
              epic={editingEpic}
              projectId={currentProject.id}
              allEpics={roadmapData.epics}
              onClose={() => setEditingEpic(null)}
              onUpdated={() => {
                setEditingEpic(null);
                fetchRoadmap();
              }}
            />
          )}
        </>
      ) : null}

      {/* Create Release Modal */}
      {showCreateRelease && currentProject && (
        <ReleaseCreateModal
          projectId={currentProject.id}
          onClose={() => setShowCreateRelease(false)}
          onCreated={() => {
            setShowCreateRelease(false);
            fetchReleases();
          }}
        />
      )}

      {/* Create Epic Modal */}
      {showCreateEpic && currentProject && selectedReleaseId && (
        <EpicCreateModal
          projectId={currentProject.id}
          releaseId={selectedReleaseId}
          onClose={() => setShowCreateEpic(false)}
          onCreated={() => {
            setShowCreateEpic(false);
            fetchRoadmap();
          }}
        />
      )}
    </div>
  );
}
