import { useState, useEffect, useCallback } from "react";
import { useProject } from "../contexts";
import { api, type Release, type ReleaseWithEpics, type Epic } from "../api";
import { PhaseSection } from "../components/roadmap";
import { EpicEditModal } from "../components/epics";

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
  const [releases, setReleases] = useState<Release[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState<number | null>(
    null,
  );
  const [roadmapData, setRoadmapData] = useState<ReleaseWithEpics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);

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
          <button className="btn btn-primary">
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
          <button className="mt-4 btn btn-primary">
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

          {roadmapData.phases.length === 0 ? (
            <div className="text-center py-8 card">
              <p className="text-system-500 dark:text-system-400">
                No epics assigned to this release yet.
              </p>
            </div>
          ) : (
            roadmapData.phases
              .sort((a, b) => a.phaseNumber - b.phaseNumber)
              .map((phase) => {
                // Filter epics for this phase
                const phaseEpics = roadmapData.epics.filter((e) =>
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
    </div>
  );
}
