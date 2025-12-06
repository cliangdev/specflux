import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  api,
  getApiErrorMessage,
  type Epic,
  type Task,
  type Release,
  type AcceptanceCriteria as AcceptanceCriterion,
  EpicStatus,
} from "../api";
import { useProject } from "../contexts";
import { ProgressBar, TaskCreateModal } from "../components/ui";
import { EpicDetailHeader } from "../components/epics";
import { AcceptanceCriteriaList } from "../components/ui/AcceptanceCriteriaList";
import { calculatePhase } from "../utils/phaseCalculation";

// Extended type to support v2 fields
type EpicWithV2Fields = Omit<Epic, "dependsOn" | "taskStats" | "status"> & {
  v2Id?: string;
  displayKey?: string;
  status: string; // Allow UPPER_CASE status from v2 API
  taskStats?: {
    total?: number;
    done?: number;
    inProgress?: number;
    backlog?: number;
  };
  progressPercentage?: number;
  phase?: number;
  dependsOn?: (number | string)[];
  createdById?: string;
  prdFilePath?: string;
  epicFilePath?: string;
};

// Task status badge configuration (v2 UPPER_CASE status values)
const TASK_STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  BACKLOG: {
    label: "Backlog",
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  READY: {
    label: "Ready",
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  IN_PROGRESS: {
    label: "In Progress",
    classes:
      "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300",
  },
  IN_REVIEW: {
    label: "In Review",
    classes:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  BLOCKED: {
    label: "Blocked",
    classes: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  COMPLETED: {
    label: "Completed",
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  CANCELLED: {
    label: "Cancelled",
    classes:
      "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  },
};

export default function EpicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProjectRef } = useProject();
  const [epic, setEpic] = useState<EpicWithV2Fields | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [criteriaLoading, setCriteriaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [allEpics, setAllEpics] = useState<EpicWithV2Fields[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Inline editing state
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [editingPrd, setEditingPrd] = useState(false);
  const [prdValue, setPrdValue] = useState("");
  const [showDependencyPicker, setShowDependencyPicker] = useState(false);
  const [dependencySearch, setDependencySearch] = useState("");

  // Refs
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const prdRef = useRef<HTMLInputElement>(null);
  const dependencyPickerRef = useRef<HTMLDivElement>(null);

  // Sync editing values when epic changes
  useEffect(() => {
    if (epic) {
      setDescriptionValue(epic.description ?? "");
      setPrdValue(epic.prdFilePath ?? "");
    }
  }, [epic]);

  // Focus inputs when editing starts
  useEffect(() => {
    if (editingDescription && descriptionRef.current) {
      descriptionRef.current.focus();
    }
  }, [editingDescription]);

  useEffect(() => {
    if (editingPrd && prdRef.current) {
      prdRef.current.focus();
      prdRef.current.select();
    }
  }, [editingPrd]);

  // Close dependency picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dependencyPickerRef.current &&
        !dependencyPickerRef.current.contains(event.target as Node)
      ) {
        setShowDependencyPicker(false);
        setDependencySearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchEpicData = useCallback(async () => {
    if (!id) return;

    const projectRef = getProjectRef();
    if (!projectRef) {
      setError("No project selected");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch epic from v2 API
      const epicResponse = await api.epics.getEpic({
        projectRef,
        epicRef: id,
      });

      // Convert v2 epic to internal format
      const v2Epic = epicResponse;
      // Map v2 status to v1 status format
      const statusMap: Record<string, "planning" | "active" | "completed"> = {
        PLANNING: "planning",
        IN_PROGRESS: "active",
        COMPLETED: "completed",
      };
      const epicData: EpicWithV2Fields = {
        id: v2Epic.id,
        v2Id: v2Epic.id,
        displayKey: v2Epic.displayKey,
        projectId: v2Epic.projectId,
        title: v2Epic.title,
        description: v2Epic.description,
        status: statusMap[v2Epic.status] || "planning",
        targetDate: v2Epic.targetDate,
        createdById: v2Epic.createdById,
        createdAt: new Date(v2Epic.createdAt),
        updatedAt: new Date(v2Epic.updatedAt),
        releaseId: v2Epic.releaseId,
        prdFilePath: v2Epic.prdFilePath,
        epicFilePath: v2Epic.epicFilePath,
        dependsOn: v2Epic.dependsOn ?? [],
        taskStats: v2Epic.taskStats ?? {
          total: 0,
          done: 0,
          inProgress: 0,
          backlog: 0,
        },
        progressPercentage: v2Epic.progressPercentage ?? 0,
        phase: v2Epic.phase ?? 1,
      };
      setEpic(epicData);

      // Fetch tasks from v2 API
      try {
        const tasksResponse = await api.epics.listEpicTasks({
          projectRef,
          epicRef: id,
          limit: 100, // Fetch up to 100 tasks
        });
        const v2Tasks = tasksResponse.data ?? [];
        // Convert v2 tasks to a compatible format for display
        // Keep UPPER_CASE status from v2 API to match TASK_STATUS_CONFIG
        const convertedTasks = v2Tasks.map((t) => ({
          id: 0,
          v2Id: t.id,
          displayKey: t.displayKey,
          projectId: 0,
          epicId: null,
          epicDisplayKey: t.epicDisplayKey ?? null,
          title: t.title,
          description: t.description ?? null,
          status: t.status, // Keep UPPER_CASE status from v2 API
          priority: t.priority,
          requiresApproval: t.requiresApproval,
          estimatedDuration: t.estimatedDuration ?? null,
          actualDuration: t.actualDuration ?? null,
          githubPrUrl: t.githubPrUrl ?? null,
          createdByUserId: 0,
          assignedToUserId: null,
          progressPercentage: 0,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        })) as unknown as Task[];
        setTasks(convertedTasks);
      } catch (err) {
        console.error("Failed to fetch epic tasks:", err);
        setTasks([]);
      }

      // Fetch all epics for dependencies
      const allEpicsResponse = await api.epics.listEpics({ projectRef });
      const v2Epics = allEpicsResponse.data ?? [];
      const convertedEpics: EpicWithV2Fields[] = v2Epics.map((e) => ({
        id: e.id,
        v2Id: e.id,
        displayKey: e.displayKey,
        projectId: e.projectId,
        title: e.title,
        description: e.description,
        status: e.status, // Keep UPPER_CASE status from v2 API
        targetDate: e.targetDate,
        createdById: e.createdById,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
        releaseId: e.releaseId,
        phase: e.phase,
      }));
      setAllEpics(convertedEpics);

      // Fetch releases from v2 API
      const releasesResponse = await api.releases.listReleases({
        projectRef,
      });
      const v2Releases = releasesResponse.data ?? [];
      const convertedReleases: Release[] = v2Releases.map((r) => ({
        id: 0,
        v2Id: r.id,
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
      })) as unknown as Release[];
      setReleases(convertedReleases);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load epic";
      setError(message);
      console.error("Failed to fetch epic:", err);
    } finally {
      setLoading(false);
    }
  }, [id, getProjectRef]);

  const fetchCriteria = useCallback(async () => {
    if (!id) return;

    try {
      setCriteriaLoading(true);

      const projectRef = getProjectRef();
      if (!projectRef) {
        setCriteria([]);
        setCriteriaLoading(false);
        return;
      }
      const response = await api.epics.listEpicAcceptanceCriteria({
        projectRef,
        epicRef: id,
      });
      const v2Criteria = response.data ?? [];
      const convertedCriteria: AcceptanceCriterion[] = v2Criteria.map((c) => ({
        id: c.id,
        criteria: c.criteria,
        isMet: c.isMet,
        orderIndex: c.orderIndex,
        createdAt: new Date(c.createdAt),
      })) as unknown as AcceptanceCriterion[];
      setCriteria(convertedCriteria);
    } catch (err) {
      console.error("Failed to fetch criteria:", err);
    } finally {
      setCriteriaLoading(false);
    }
  }, [id, getProjectRef]);

  useEffect(() => {
    fetchEpicData();
    fetchCriteria();
  }, [fetchEpicData, fetchCriteria]);

  // Helper to get epic ref (v2Id for v2, id for fallback)
  const getEpicRef = (e: EpicWithV2Fields): string | number => e.v2Id || e.id;

  // Calculate phase from dependencies
  const phase = useMemo(() => {
    if (!epic) return 1;
    // For v2, use the phase from the epic data
    return epic.phase ?? 1;
  }, [epic]);

  // Available epics for dependency selection (exclude current epic and detect circular)
  const availableEpics = useMemo(() => {
    if (!epic) return [];
    const currentRef = getEpicRef(epic);
    return allEpics.filter((e) => getEpicRef(e) !== currentRef);
  }, [allEpics, epic]);

  // Filter available epics by search
  const filteredAvailableEpics = useMemo(() => {
    if (!dependencySearch) return availableEpics;
    const query = dependencySearch.toLowerCase();
    return availableEpics.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.displayKey?.toLowerCase().includes(query) ||
        e.v2Id?.toLowerCase().includes(query) ||
        e.id.toString().includes(query),
    );
  }, [availableEpics, dependencySearch]);

  // Get dependency epic objects
  const dependencyEpics = useMemo(() => {
    if (!epic?.dependsOn || epic.dependsOn.length === 0) return [];
    // For v2, dependsOn contains v2Ids (strings)
    const depsSet = new Set(epic.dependsOn);
    return allEpics.filter((e) => e.v2Id && depsSet.has(e.v2Id));
  }, [epic, allEpics]);

  // Map status to v2 status enum
  const mapStatusToV2 = (status: string): EpicStatus => {
    switch (status) {
      case "PLANNING":
        return EpicStatus.Planning;
      case "IN_PROGRESS":
        return EpicStatus.InProgress;
      case "COMPLETED":
        return EpicStatus.Completed;
      default:
        return EpicStatus.Planning;
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (!epic) return;

    try {
      const projectRef = getProjectRef();
      if (!projectRef || !epic.v2Id) return;
      await api.epics.updateEpic({
        projectRef,
        epicRef: epic.v2Id,
        updateEpicRequest: {
          status: mapStatusToV2(newStatus),
        },
      });
      fetchEpicData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      setError(message);
      console.error("Failed to update status:", err);
    }
  };

  // Handle title change
  const handleTitleChange = async (newTitle: string) => {
    if (!epic) return;

    try {
      const projectRef = getProjectRef();
      if (!projectRef || !epic.v2Id) return;
      await api.epics.updateEpic({
        projectRef,
        epicRef: epic.v2Id,
        updateEpicRequest: { title: newTitle },
      });
      fetchEpicData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update title";
      setError(message);
      console.error("Failed to update title:", err);
    }
  };

  // Handle release change
  const handleReleaseChange = async (releaseId: string | null) => {
    if (!epic) return;

    // Release assignment not yet implemented for v2
    console.log("Release assignment not yet implemented for v2");
    return;
  };

  // Handle description save
  const handleDescriptionSave = async () => {
    if (!epic) return;
    const trimmed = descriptionValue.trim();
    if (trimmed !== (epic.description ?? "")) {
      try {
        const projectRef = getProjectRef();
        if (!projectRef || !epic.v2Id) return;
        await api.epics.updateEpic({
          projectRef,
          epicRef: epic.v2Id,
          updateEpicRequest: { description: trimmed || undefined },
        });
        fetchEpicData();
      } catch (err) {
        console.error("Failed to update description:", err);
        setDescriptionValue(epic.description ?? "");
      }
    }
    setEditingDescription(false);
  };

  // Handle PRD path save
  const handlePrdSave = async () => {
    if (!epic) return;

    // PRD path not yet implemented for v2
    console.log("PRD path not yet implemented for v2");
    setEditingPrd(false);
    return;
  };

  // Handle add dependency (uses v2Id)
  const handleAddDependency = async (depEpicRef: number | string) => {
    if (!epic) return;

    // Dependencies not yet implemented for v2
    console.log("Dependencies not yet implemented for v2");
    return;
  };

  // Handle remove dependency (uses v2Id)
  const handleRemoveDependency = async (depEpicRef: number | string) => {
    if (!epic) return;

    // Dependencies not yet implemented for v2
    console.log("Dependencies not yet implemented for v2");
    return;
  };

  // Handle epic deletion
  const handleDelete = async () => {
    if (!epic) return;

    try {
      setDeleting(true);
      const projectRef = getProjectRef();
      if (!projectRef || !epic.v2Id) return;
      await api.epics.deleteEpic({
        projectRef,
        epicRef: epic.v2Id,
      });
      navigate("/epics");
    } catch (err) {
      const message = await getApiErrorMessage(err, "Failed to delete epic");
      setError(message);
      console.error("Failed to delete epic:", err);
      setDeleting(false);
    }
  };

  // Keyboard handlers
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

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 dark:text-red-400 text-lg">
          Error loading epic
        </div>
        <p className="text-system-500 mt-2">{error}</p>
        <button onClick={fetchEpicData} className="mt-4 btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  if (!epic) {
    return (
      <div className="text-center py-12">
        <div className="text-system-500 dark:text-system-400 text-lg">
          Epic not found
        </div>
        <Link to="/epics" className="mt-4 btn btn-primary inline-block">
          Back
        </Link>
      </div>
    );
  }

  const taskStats = epic.taskStats || { total: 0, done: 0, inProgress: 0 };
  const progressPercent = epic.progressPercentage ?? 0;
  const remaining =
    (taskStats.total ?? 0) -
    (taskStats.done ?? 0) -
    (taskStats.inProgress ?? 0);

  return (
    <div>
      {/* Header */}
      <EpicDetailHeader
        epic={epic as unknown as Epic}
        releases={releases}
        phase={phase}
        onStatusChange={handleStatusChange}
        onTitleChange={handleTitleChange}
        onReleaseChange={handleReleaseChange}
        onDelete={handleDelete}
        onBack={() => navigate(-1)}
        deleting={deleting}
      />

      {/* Progress Summary Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between gap-8">
          <div className="flex-1">
            <div className="text-sm text-system-500 dark:text-system-400 mb-2">
              Overall Progress
            </div>
            <ProgressBar percent={progressPercent} size="lg" showLabel />
          </div>

          <div className="flex items-center gap-8 text-sm">
            <div className="text-center">
              <div className="text-2xl font-semibold text-system-900 dark:text-white">
                {taskStats.done ?? 0}
              </div>
              <div className="text-system-500 dark:text-system-400">Done</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-brand-600 dark:text-brand-400">
                {taskStats.inProgress ?? 0}
              </div>
              <div className="text-system-500 dark:text-system-400">
                In Progress
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-system-600 dark:text-system-300">
                {remaining}
              </div>
              <div className="text-system-500 dark:text-system-400">
                Remaining
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-system-900 dark:text-white">
                {taskStats.total ?? 0}
              </div>
              <div className="text-system-500 dark:text-system-400">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Description Section - Inline Editable */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-system-900 dark:text-white mb-3">
          Description
        </h2>
        <div className="card p-5">
          {editingDescription ? (
            <textarea
              ref={descriptionRef}
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              onBlur={handleDescriptionSave}
              onKeyDown={(e) =>
                handleKeyDown(e, handleDescriptionSave, () => {
                  setDescriptionValue(epic.description ?? "");
                  setEditingDescription(false);
                })
              }
              placeholder="Add a description..."
              className="w-full text-system-700 dark:text-system-300 bg-transparent border border-brand-500 rounded-md p-3 outline-none resize-none min-h-[100px]"
              rows={4}
            />
          ) : (
            <p
              onClick={() => setEditingDescription(true)}
              className={`whitespace-pre-wrap cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors min-h-[24px] ${
                epic.description
                  ? "text-system-700 dark:text-system-300"
                  : "text-system-400 dark:text-system-500 italic"
              }`}
              title="Click to edit"
            >
              {epic.description || "Click to add a description..."}
            </p>
          )}
        </div>
      </div>

      {/* PRD File Path - Inline Editable */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-system-900 dark:text-white mb-3">
          PRD File Path
        </h2>
        <div className="card p-4">
          {editingPrd ? (
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-system-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <input
                ref={prdRef}
                type="text"
                value={prdValue}
                onChange={(e) => setPrdValue(e.target.value)}
                onBlur={handlePrdSave}
                onKeyDown={(e) =>
                  handleKeyDown(e, handlePrdSave, () => {
                    setPrdValue(epic.prdFilePath ?? "");
                    setEditingPrd(false);
                  })
                }
                placeholder="e.g., prds/feature-name.md"
                className="flex-1 text-system-700 dark:text-system-300 bg-transparent border-b-2 border-brand-500 outline-none"
              />
            </div>
          ) : (
            <div
              onClick={() => setEditingPrd(true)}
              className="flex items-center gap-3 cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              title="Click to edit"
            >
              <svg
                className="w-5 h-5 text-system-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {epic.prdFilePath ? (
                <code className="text-sm bg-system-100 dark:bg-system-800 px-2 py-0.5 rounded text-system-700 dark:text-system-300">
                  {epic.prdFilePath}
                </code>
              ) : (
                <span className="text-system-400 dark:text-system-500 italic">
                  Click to add PRD file path...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Acceptance Criteria Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-system-900 dark:text-white mb-3">
          Acceptance Criteria
        </h2>
        <div className="card p-5">
          {criteriaLoading ? (
            <div className="text-sm text-system-400 dark:text-system-500">
              Loading...
            </div>
          ) : (
            <AcceptanceCriteriaList
              entityType="epic"
              entityId={epic.id}
              criteria={criteria}
              onUpdate={fetchCriteria}
            />
          )}
        </div>
      </div>

      {/* Dependencies Section - Inline Editable */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-system-900 dark:text-white">
            Dependencies
          </h2>
          <div className="relative" ref={dependencyPickerRef}>
            <button
              onClick={() => setShowDependencyPicker(!showDependencyPicker)}
              className="btn btn-ghost text-sm"
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
              Add
            </button>

            {/* Dependency Picker Dropdown */}
            {showDependencyPicker && (
              <div className="absolute right-0 z-50 mt-1 w-80 bg-white dark:bg-system-800 rounded-lg shadow-lg border border-system-200 dark:border-system-700 overflow-hidden">
                <div className="p-2 border-b border-system-200 dark:border-system-700">
                  <input
                    type="text"
                    value={dependencySearch}
                    onChange={(e) => setDependencySearch(e.target.value)}
                    placeholder="Search epics..."
                    className="input w-full text-sm"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredAvailableEpics.length === 0 ? (
                    <div className="p-4 text-sm text-system-500 dark:text-system-400 text-center">
                      No epics found
                    </div>
                  ) : (
                    filteredAvailableEpics.map((e) => {
                      const epicRef = getEpicRef(e);
                      // For v2, check if v2Id is in dependsOn (which contains v2Ids)
                      const isSelected = epic.dependsOn?.includes(
                        e.v2Id as string,
                      );
                      const epicPhase = e.phase ?? 1;
                      const displayId = e.displayKey || e.v2Id || `#${e.id}`;
                      return (
                        <button
                          key={epicRef}
                          onClick={() =>
                            isSelected
                              ? handleRemoveDependency(epicRef)
                              : handleAddDependency(epicRef)
                          }
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-system-100 dark:hover:bg-system-700 ${
                            isSelected ? "bg-brand-50 dark:bg-brand-900/20" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded border-system-300 dark:border-system-600 text-brand-600 focus:ring-brand-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-system-500 dark:text-system-400">
                                {displayId}
                              </span>
                              <span className="text-system-900 dark:text-white truncate">
                                {e.title}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-system-100 dark:bg-system-700 text-system-600 dark:text-system-400">
                            P{epicPhase}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          {dependencyEpics.length === 0 ? (
            <p className="text-system-500 dark:text-system-400 text-sm">
              No dependencies. This epic is in Phase 1 and can start
              immediately.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {dependencyEpics.map((depEpic) => {
                const depRef = getEpicRef(depEpic);
                const displayId =
                  depEpic.displayKey || depEpic.v2Id || `#${depEpic.id}`;
                return (
                  <div
                    key={depRef}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-system-100 dark:bg-system-700 rounded-lg text-sm"
                  >
                    <Link
                      to={`/epics/${depRef}`}
                      className="flex items-center gap-2 text-system-700 dark:text-system-300 hover:text-brand-600 dark:hover:text-brand-400"
                    >
                      <span className="text-xs text-system-500 dark:text-system-400">
                        {displayId}
                      </span>
                      <span>{depEpic.title}</span>
                    </Link>
                    <button
                      onClick={() => handleRemoveDependency(depRef)}
                      className="text-system-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Remove dependency"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tasks Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-system-900 dark:text-white">
            Tasks
          </h2>
          <button
            onClick={() => setShowCreateTaskModal(true)}
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
            Add Task
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="card p-8 text-center">
            <svg
              className="mx-auto h-10 w-10 text-system-400 dark:text-system-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="mt-3 text-system-500 dark:text-system-400">
              No tasks in this epic yet.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-system-200 dark:divide-system-700">
              <thead className="bg-system-50 dark:bg-system-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-system-500 dark:text-system-400 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-system-500 dark:text-system-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-system-200 dark:divide-system-700">
                {tasks.map((task) => {
                  const taskStatusConfig =
                    TASK_STATUS_CONFIG[task.status] ||
                    TASK_STATUS_CONFIG.BACKLOG;
                  // Get task ref and display id for v2 support
                  const taskWithV2 = task as Task & {
                    v2Id?: string;
                    publicId?: string;
                    displayKey?: string;
                  };
                  const taskRef =
                    taskWithV2.v2Id || taskWithV2.publicId || task.id;
                  const displayId =
                    taskWithV2.displayKey ||
                    taskWithV2.v2Id ||
                    taskWithV2.publicId ||
                    `#${task.id}`;
                  return (
                    <tr
                      key={taskRef}
                      onClick={() => navigate(`/tasks/${taskRef}`)}
                      className="hover:bg-system-50 dark:hover:bg-system-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-system-500 dark:text-system-400 font-mono">
                            {displayId}
                          </span>
                          <span className="text-sm font-medium text-system-900 dark:text-white">
                            {task.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${taskStatusConfig.classes}`}
                        >
                          {taskStatusConfig.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateTaskModal && epic && (
        <TaskCreateModal
          projectId={epic.projectId}
          defaultEpicId={epic.id}
          onClose={() => setShowCreateTaskModal(false)}
          onCreated={fetchEpicData}
        />
      )}
    </div>
  );
}
