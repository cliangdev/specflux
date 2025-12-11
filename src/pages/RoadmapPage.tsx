import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useProject } from "../contexts";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import type { Release, ReleaseStatus } from "../api/generated/models";
import { PhaseSection } from "../components/roadmap";
import { EpicEditModal, EpicCreateModal } from "../components/epics";
import { ReleaseCreateModal } from "../components/releases";
import type { Epic as GeneratedEpic } from "../api/generated/models";

// Local Epic type extension for roadmap (v2 API Epic doesn't have all fields yet)
type Epic = GeneratedEpic;

interface ReleaseWithEpics {
  release: Release;
  epics: Epic[];
  phases: Array<{
    phaseNumber: number;
    status: string;
    epicIds: string[];
    completedCount: number;
    totalCount: number;
  }>;
}

const FILTERS_STORAGE_KEY = "specflux-roadmap-filters";

interface RoadmapFilters {
  selectedReleaseId: string | "all" | null;
  status: string;
  q: string;
}

function loadFilters(): RoadmapFilters {
  try {
    const stored = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        selectedReleaseId: parsed.selectedReleaseId ?? "all",
        status: parsed.status ?? "all",
        q: parsed.q ?? "",
      };
    }
  } catch {
    // Invalid JSON, use defaults
  }
  return { selectedReleaseId: "all", status: "all", q: "" };
}

function saveFilters(filters: RoadmapFilters): void {
  localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "No target date";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getReleaseStatusBadge(status: ReleaseStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "RELEASED":
      return {
        label: "Released",
        className: "bg-semantic-success/20 text-semantic-success",
      };
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        className: "bg-brand-500/20 text-brand-600 dark:text-brand-400",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        className:
          "bg-system-400 dark:bg-system-600 text-system-700 dark:text-system-300",
      };
    default: // PLANNED
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
      <div className="card mb-6 p-5">
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
  epicCount?: number;
  completedEpicCount?: number;
  onUpdate: () => void;
}

const RELEASE_STATUSES = [
  { value: "PLANNED" as ReleaseStatus, label: "Planned" },
  { value: "IN_PROGRESS" as ReleaseStatus, label: "In Progress" },
  { value: "RELEASED" as ReleaseStatus, label: "Released" },
  { value: "CANCELLED" as ReleaseStatus, label: "Cancelled" },
] as const;

function ReleaseHeader({
  release,
  epicCount = 0,
  completedEpicCount = 0,
  onUpdate,
}: ReleaseHeaderProps) {
  const statusBadge = getReleaseStatusBadge(release.status);
  const progress = epicCount > 0 ? Math.round((completedEpicCount / epicCount) * 100) : 0;

  // Editing state
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Form values
  const [nameValue, setNameValue] = useState(release.name);
  const [descriptionValue, setDescriptionValue] = useState(
    release.description ?? "",
  );
  const [dateValue, setDateValue] = useState(
    release.targetDate
      ? new Date(release.targetDate).toISOString().split("T")[0]
      : "",
  );

  // Refs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Sync values when release prop changes
  useEffect(() => {
    setNameValue(release.name);
    setDescriptionValue(release.description ?? "");
    setDateValue(
      release.targetDate
        ? new Date(release.targetDate).toISOString().split("T")[0]
        : "",
    );
  }, [release]);

  // Focus inputs when editing starts
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  useEffect(() => {
    if (editingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, [editingDescription]);

  useEffect(() => {
    if (editingDate && dateInputRef.current) {
      dateInputRef.current.focus();
    }
  }, [editingDate]);

  // Close status dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update handlers
  const handleNameSave = async () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== release.name) {
      try {
        await api.releases.updateRelease({
          projectRef: release.projectId,
          releaseRef: release.id,
          updateReleaseRequest: { name: trimmed },
        });
        onUpdate();
      } catch (err) {
        console.error("Failed to update release name:", err);
        setNameValue(release.name);
      }
    } else {
      setNameValue(release.name);
    }
    setEditingName(false);
  };

  const handleDescriptionSave = async () => {
    const trimmed = descriptionValue.trim();
    if (trimmed !== (release.description ?? "")) {
      try {
        await api.releases.updateRelease({
          projectRef: release.projectId,
          releaseRef: release.id,
          updateReleaseRequest: { description: trimmed || undefined },
        });
        onUpdate();
      } catch (err) {
        console.error("Failed to update release description:", err);
        setDescriptionValue(release.description ?? "");
      }
    }
    setEditingDescription(false);
  };

  const handleDateSave = async () => {
    const newDate = dateValue ? new Date(dateValue) : undefined;
    const currentDate = release.targetDate
      ? new Date(release.targetDate).toISOString().split("T")[0]
      : "";

    if (dateValue !== currentDate) {
      try {
        await api.releases.updateRelease({
          projectRef: release.projectId,
          releaseRef: release.id,
          updateReleaseRequest: { targetDate: newDate },
        });
        onUpdate();
      } catch (err) {
        console.error("Failed to update release date:", err);
        setDateValue(
          release.targetDate
            ? new Date(release.targetDate).toISOString().split("T")[0]
            : "",
        );
      }
    }
    setEditingDate(false);
  };

  const handleStatusChange = async (newStatus: ReleaseStatus) => {
    if (newStatus !== release.status) {
      try {
        await api.releases.updateRelease({
          projectRef: release.projectId,
          releaseRef: release.id,
          updateReleaseRequest: { status: newStatus },
        });
        onUpdate();
      } catch (err) {
        console.error("Failed to update release status:", err);
      }
    }
    setStatusDropdownOpen(false);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    saveHandler: () => void,
    cancelHandler: () => void,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveHandler();
    } else if (e.key === "Escape") {
      cancelHandler();
    }
  };

  return (
    <div className="card mb-6 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Editable Name */}
            {editingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) =>
                  handleKeyDown(e, handleNameSave, () => {
                    setNameValue(release.name);
                    setEditingName(false);
                  })
                }
                className="text-xl font-semibold text-system-900 dark:text-white bg-transparent border-b-2 border-brand-500 outline-none min-w-[200px]"
              />
            ) : (
              <h2
                onClick={() => setEditingName(true)}
                className="text-xl font-semibold text-system-900 dark:text-white cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                title="Click to edit"
              >
                {release.name}
              </h2>
            )}

            {/* Status Dropdown */}
            <div className="relative" ref={statusDropdownRef}>
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className} hover:opacity-80 transition-opacity cursor-pointer`}
                title="Click to change status"
              >
                {statusBadge.label}
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {statusDropdownOpen && (
                <div className="absolute z-50 mt-1 w-36 bg-white dark:bg-system-800 rounded-lg shadow-lg border border-system-200 dark:border-system-700 py-1">
                  {RELEASE_STATUSES.map((status) => {
                    const isSelected = release.status === status.value;
                    return (
                      <button
                        key={status.value}
                        onClick={() => handleStatusChange(status.value)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-system-100 dark:hover:bg-system-700 ${
                          isSelected ? "bg-system-100 dark:bg-system-700" : ""
                        }`}
                      >
                        <span
                          className={
                            isSelected
                              ? "font-medium text-system-900 dark:text-white"
                              : "text-system-700 dark:text-system-300"
                          }
                        >
                          {status.label}
                        </span>
                        {isSelected && (
                          <svg
                            className="w-4 h-4 text-brand-600 dark:text-brand-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Editable Description */}
          {editingDescription ? (
            <textarea
              ref={descriptionInputRef}
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              onBlur={handleDescriptionSave}
              onKeyDown={(e) =>
                handleKeyDown(e, handleDescriptionSave, () => {
                  setDescriptionValue(release.description ?? "");
                  setEditingDescription(false);
                })
              }
              placeholder="Add a description..."
              className="mt-2 w-full text-system-600 dark:text-system-400 bg-transparent border border-brand-500 rounded-md p-2 outline-none resize-none"
              rows={2}
            />
          ) : (
            <p
              onClick={() => setEditingDescription(true)}
              className={`mt-1 cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors ${
                release.description
                  ? "text-system-600 dark:text-system-400"
                  : "text-system-400 dark:text-system-500 italic"
              }`}
              title="Click to edit"
            >
              {release.description || "Add a description..."}
            </p>
          )}
        </div>

        {/* Editable Target Date */}
        <div className="text-right flex-shrink-0">
          <div className="text-sm text-system-500 dark:text-system-400">
            Target Date
          </div>
          {editingDate ? (
            <input
              ref={dateInputRef}
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              onBlur={handleDateSave}
              onKeyDown={(e) =>
                handleKeyDown(e, handleDateSave, () => {
                  setDateValue(
                    release.targetDate
                      ? new Date(release.targetDate).toISOString().split("T")[0]
                      : "",
                  );
                  setEditingDate(false);
                })
              }
              className="font-medium text-system-900 dark:text-white bg-transparent border-b-2 border-brand-500 outline-none"
            />
          ) : (
            <div
              onClick={() => setEditingDate(true)}
              className={`font-medium cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors ${
                release.targetDate
                  ? "text-system-900 dark:text-white"
                  : "text-system-400 dark:text-system-500 italic"
              }`}
              title="Click to edit"
            >
              {formatDate(release.targetDate)}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-system-600 dark:text-system-400">
            {epicCount} {epicCount === 1 ? "epic" : "epics"}
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
  const { currentProject, getProjectRef } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const [releases, setReleases] = useState<Release[]>([]);

  // Load initial filters from localStorage
  const [initialFilters] = useState(loadFilters);

  // "all" means show all releases, string ID means specific release
  const [selectedReleaseId, setSelectedReleaseId] = useState<
    string | "all" | null
  >(() => {
    // URL param takes priority, then localStorage
    const urlRelease = searchParams.get("release");
    if (urlRelease === "all") return "all";
    if (urlRelease) return urlRelease;
    return initialFilters.selectedReleaseId;
  });

  const [roadmapData, setRoadmapData] = useState<ReleaseWithEpics | null>(null);
  const [allRoadmapData, setAllRoadmapData] = useState<ReleaseWithEpics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [showCreateRelease, setShowCreateRelease] = useState(false);
  const [showCreateEpic, setShowCreateEpic] = useState(false);
  const [createEpicReleaseId, setCreateEpicReleaseId] = useState<string | null>(
    null,
  );

  // Filter state - initialize from URL params first, then localStorage
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") || initialFilters.status,
  );
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") || initialFilters.q,
  );

  // Persist filters to localStorage
  useEffect(() => {
    saveFilters({
      selectedReleaseId,
      status: statusFilter,
      q: searchQuery,
    });
  }, [selectedReleaseId, statusFilter, searchQuery]);

  // Sync URL params with filter state
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (selectedReleaseId !== null && selectedReleaseId !== "all") {
      newParams.set("release", String(selectedReleaseId));
    } else if (selectedReleaseId === "all") {
      newParams.set("release", "all");
    }
    if (statusFilter !== "all") newParams.set("status", statusFilter);
    if (searchQuery) newParams.set("q", searchQuery);
    setSearchParams(newParams, { replace: true });
  }, [selectedReleaseId, statusFilter, searchQuery, setSearchParams]);

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

      const projectRef = getProjectRef();
      if (!projectRef) {
        setReleases([]);
        setLoading(false);
        return;
      }
      console.log("[RoadmapPage] Fetching releases from v2 API");
      const response = await api.releases.listReleases({ projectRef });
      const releaseList = response.data ?? [];
      setReleases(releaseList);

      // Auto-select "all" if none selected and releases exist
      if (releaseList.length > 0 && selectedReleaseId === null) {
        setSelectedReleaseId("all");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load releases";
      setError(message);
      console.error("Failed to fetch releases:", err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, selectedReleaseId, getProjectRef]);

  // Helper to compute phases from epics
  const computePhases = useCallback((epics: Epic[]) => {
    // Group epics by phase
    const phaseMap = new Map<number, Epic[]>();
    for (const epic of epics) {
      const phase = epic.phase ?? 1;
      if (!phaseMap.has(phase)) {
        phaseMap.set(phase, []);
      }
      phaseMap.get(phase)!.push(epic);
    }

    // Convert to phases array
    return Array.from(phaseMap.entries()).map(([phaseNumber, phaseEpics]) => {
      const completedCount = phaseEpics.filter(
        (e) => e.status === "COMPLETED",
      ).length;
      const inProgressCount = phaseEpics.filter(
        (e) => e.status === "IN_PROGRESS",
      ).length;
      const blockedCount = phaseEpics.filter(
        (e) => e.status === "BLOCKED",
      ).length;

      let status: string;
      if (completedCount === phaseEpics.length) {
        status = "completed";
      } else if (blockedCount > 0) {
        status = "blocked";
      } else if (inProgressCount > 0) {
        status = "in_progress";
      } else {
        status = "ready";
      }

      return {
        phaseNumber,
        status,
        epicIds: phaseEpics.map((e) => e.id),
        completedCount,
        totalCount: phaseEpics.length,
      };
    });
  }, []);

  // Fetch roadmap data for selected release(s)
  const fetchRoadmap = useCallback(async () => {
    if (selectedReleaseId === null || !currentProject) {
      setRoadmapData(null);
      setAllRoadmapData([]);
      return;
    }

    const projectRef = getProjectRef();
    if (!projectRef) return;

    try {
      setError(null);

      if (selectedReleaseId === "all") {
        // Fetch epics for all releases in parallel
        const allData: ReleaseWithEpics[] = await Promise.all(
          releases.map(async (release) => {
            try {
              const response = await api.epics.listEpics({
                projectRef,
                releaseRef: release.id,
                limit: 100,
              });
              const epics = response.data ?? [];
              const phases = computePhases(epics);
              return { release, epics, phases };
            } catch {
              return { release, epics: [], phases: [] };
            }
          }),
        );
        setAllRoadmapData(allData);
        setRoadmapData(null);
      } else {
        const release = releases.find((r) => r.id === selectedReleaseId);
        if (release) {
          const response = await api.epics.listEpics({
            projectRef,
            releaseRef: release.id,
            limit: 100,
          });
          const epics = response.data ?? [];
          const phases = computePhases(epics);
          setRoadmapData({ release, epics, phases });
        }
        setAllRoadmapData([]);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load roadmap";
      setError(message);
      console.error("Failed to fetch roadmap:", err);
    }
  }, [selectedReleaseId, releases, currentProject, getProjectRef, computePhases]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  useEffect(() => {
    if (selectedReleaseId !== null) {
      fetchRoadmap();
    }
  }, [selectedReleaseId, fetchRoadmap]);

  const handleRefresh = () => {
    fetchReleases();
    fetchRoadmap();
  };

  // Helper to filter epics
  const filterEpics = useCallback(
    (epics: Epic[]) => {
      return epics.filter((epic) => {
        if (statusFilter !== "all" && epic.status !== statusFilter) {
          return false;
        }
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
    },
    [statusFilter, searchQuery],
  );

  // Filter epics based on status and search query (single release view)
  const filteredEpics = useMemo(() => {
    if (!roadmapData?.epics) return [];
    return filterEpics(roadmapData.epics);
  }, [roadmapData?.epics, filterEpics]);

  // Compute filtered phases (only phases containing filtered epics)
  const filteredPhases = useMemo(() => {
    if (!roadmapData?.phases) return [];

    const filteredEpicIds = new Set(filteredEpics.map((e) => e.id));

    return roadmapData.phases
      .map(
        (phase: {
          phaseNumber: number;
          status: string;
          epicIds: string[];
          completedCount: number;
          totalCount: number;
        }) => ({
          ...phase,
          epicIds: phase.epicIds.filter((id: string) =>
            filteredEpicIds.has(id),
          ),
        }),
      )
      .filter((phase: { epicIds: string[] }) => phase.epicIds.length > 0);
  }, [roadmapData?.phases, filteredEpics]);

  const hasActiveFilters = statusFilter !== "all" || searchQuery !== "";

  // Filter data for all releases view
  const filteredAllRoadmapData = useMemo(() => {
    return allRoadmapData
      .map((rd) => {
        const epics = filterEpics(rd.epics);
        const epicIds = new Set(epics.map((e) => e.id));
        const phases = rd.phases
          .map(
            (phase: {
              phaseNumber: number;
              status: string;
              epicIds: string[];
              completedCount: number;
              totalCount: number;
            }) => ({
              ...phase,
              epicIds: phase.epicIds.filter((id: string) => epicIds.has(id)),
            }),
          )
          .filter((phase: { epicIds: string[] }) => phase.epicIds.length > 0);
        return { ...rd, epics, phases };
      })
      .filter((rd) => rd.epics.length > 0 || !hasActiveFilters);
  }, [allRoadmapData, filterEpics, hasActiveFilters]);

  const totalEpicsCount =
    selectedReleaseId === "all"
      ? allRoadmapData.reduce((sum, rd) => sum + rd.epics.length, 0)
      : (roadmapData?.epics.length ?? 0);
  const filteredEpicsCount =
    selectedReleaseId === "all"
      ? filteredAllRoadmapData.reduce((sum, rd) => sum + rd.epics.length, 0)
      : filteredEpics.length;

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
              onChange={(e) => {
                const val = e.target.value;
                if (val === "all") {
                  setSelectedReleaseId("all");
                } else if (val) {
                  setSelectedReleaseId(val);
                } else {
                  setSelectedReleaseId(null);
                }
              }}
              className="select w-[200px]"
            >
              <option value="all">All Releases</option>
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
      ) : selectedReleaseId === "all" && allRoadmapData.length > 0 ? (
        <>
          {/* Filter controls for all releases view */}
          {totalEpicsCount > 0 && (
            <div className="flex items-center gap-4 mb-6">
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
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select"
              >
                <option value="all">All Statuses</option>
                <option value="PLANNING">Planning</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <div className="text-sm text-system-500 dark:text-system-400">
                {hasActiveFilters ? (
                  <>
                    Showing {filteredEpicsCount} of {totalEpicsCount} epics
                    <button
                      onClick={() => setSearchParams(new URLSearchParams())}
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

          {/* All releases view */}
          <div className="space-y-8">
            {filteredAllRoadmapData.map((rd) => (
              <div key={rd.release.id}>
                <ReleaseHeader
                  release={rd.release}
                  epicCount={rd.epics.length}
                  completedEpicCount={rd.epics.filter((e) => e.status === "COMPLETED").length}
                  onUpdate={handleRefresh}
                />
                {rd.phases.length === 0 && !hasActiveFilters ? (
                  <div className="text-center py-8 card mt-4">
                    <p className="text-system-500 dark:text-system-400">
                      No epics in this release
                    </p>
                    <button
                      onClick={() => {
                        setCreateEpicReleaseId(rd.release.id);
                        setShowCreateEpic(true);
                      }}
                      className="mt-2 btn btn-ghost text-sm"
                    >
                      Add Epic
                    </button>
                  </div>
                ) : (
                  rd.phases
                    .sort(
                      (
                        a: { phaseNumber: number },
                        b: { phaseNumber: number },
                      ) => a.phaseNumber - b.phaseNumber,
                    )
                    .map(
                      (phase: {
                        phaseNumber: number;
                        status: string;
                        epicIds: string[];
                        completedCount: number;
                        totalCount: number;
                      }) => {
                        const phaseEpics = rd.epics.filter((e: Epic) =>
                          phase.epicIds.includes(e.id),
                        );
                        return (
                          <PhaseSection
                            key={`${rd.release.id}-${phase.phaseNumber}`}
                            phaseNumber={phase.phaseNumber}
                            status={
                              phase.status as
                                | "ready"
                                | "in_progress"
                                | "blocked"
                                | "completed"
                            }
                            epics={phaseEpics}
                            allEpics={rd.epics}
                            completedCount={phase.completedCount}
                            totalCount={phase.totalCount}
                            onEditEpic={setEditingEpic}
                          />
                        );
                      },
                    )
                )}
              </div>
            ))}
          </div>

          {/* Epic Edit Modal - Note: Epic API not fully migrated yet */}
        </>
      ) : roadmapData ? (
        <>
          <ReleaseHeader
            release={roadmapData.release}
            epicCount={roadmapData.epics.length}
            completedEpicCount={roadmapData.epics.filter((e) => e.status === "COMPLETED").length}
            onUpdate={handleRefresh}
          />

          {/* Filter controls */}
          {totalEpicsCount > 0 && (
            <div className="flex items-center gap-4 mb-6">
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
                <option value="PLANNING">Planning</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
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
                onClick={() => {
                  setCreateEpicReleaseId(
                    typeof selectedReleaseId === "string" &&
                      selectedReleaseId !== "all"
                      ? selectedReleaseId
                      : null,
                  );
                  setShowCreateEpic(true);
                }}
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
              .sort(
                (a: { phaseNumber: number }, b: { phaseNumber: number }) =>
                  a.phaseNumber - b.phaseNumber,
              )
              .map(
                (phase: {
                  phaseNumber: number;
                  status: string;
                  epicIds: string[];
                  completedCount: number;
                  totalCount: number;
                }) => {
                  // Filter epics for this phase
                  const phaseEpics = filteredEpics.filter((e: Epic) =>
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
                },
              )
          )}

          {/* Epic Edit Modal - Note: Epic API not fully migrated yet */}
        </>
      ) : null}

      {/* Create Release Modal - Note: Modal may need v2 API updates */}
      {/* Create Epic Modal - Note: Epic API not fully migrated yet */}
    </div>
  );
}
