import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  api,
  getApiErrorMessage,
  type Epic,
  type Task,
  type Release,
} from "../api";
import type { AcceptanceCriterion } from "../api/generated";
import { ProgressBar, TaskCreateModal } from "../components/ui";
import { EpicDetailHeader } from "../components/epics";
import { AcceptanceCriteriaList } from "../components/ui/AcceptanceCriteriaList";
import { calculatePhase } from "../utils/phaseCalculation";

// Task status badge configuration
const TASK_STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  backlog: {
    label: "Backlog",
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  ready: {
    label: "Ready",
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  in_progress: {
    label: "In Progress",
    classes:
      "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300",
  },
  pending_review: {
    label: "Pending Review",
    classes:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  approved: {
    label: "Approved",
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  done: {
    label: "Done",
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
};

export default function EpicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [epic, setEpic] = useState<Epic | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [criteriaLoading, setCriteriaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [allEpics, setAllEpics] = useState<Epic[]>([]);
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

    try {
      setLoading(true);
      setError(null);

      const [epicResponse, tasksResponse] = await Promise.all([
        api.epics.getEpic({ id: parseInt(id, 10) }),
        api.epics.getEpicTasks({ id: parseInt(id, 10) }),
      ]);

      const epicData = epicResponse.data ?? null;
      setEpic(epicData);
      setTasks(tasksResponse.data ?? []);

      // Fetch all epics and releases for the project
      if (epicData?.projectId) {
        const [allEpicsResponse, releasesResponse] = await Promise.all([
          api.epics.listEpics({ id: epicData.projectId }),
          api.releases.listReleases({ id: epicData.projectId }),
        ]);
        setAllEpics(allEpicsResponse.data ?? []);
        setReleases(releasesResponse.data ?? []);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load epic";
      setError(message);
      console.error("Failed to fetch epic:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchCriteria = useCallback(async () => {
    if (!id) return;
    try {
      setCriteriaLoading(true);
      const response = await api.epics.listEpicCriteria({
        id: parseInt(id, 10),
      });
      setCriteria(response.data ?? []);
    } catch (err) {
      console.error("Failed to fetch criteria:", err);
    } finally {
      setCriteriaLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEpicData();
    fetchCriteria();
  }, [fetchEpicData, fetchCriteria]);

  // Calculate phase from dependencies
  const phase = useMemo(() => {
    if (!epic) return 1;
    const epicsMap = new Map<number, { dependsOn: number[] }>();
    for (const e of allEpics) {
      epicsMap.set(e.id, { dependsOn: e.dependsOn ?? [] });
    }
    return calculatePhase(epic.id, epicsMap);
  }, [epic, allEpics]);

  // Available epics for dependency selection (exclude current epic and detect circular)
  const availableEpics = useMemo(() => {
    if (!epic) return [];
    return allEpics.filter((e) => e.id !== epic.id);
  }, [allEpics, epic]);

  // Filter available epics by search
  const filteredAvailableEpics = useMemo(() => {
    if (!dependencySearch) return availableEpics;
    const query = dependencySearch.toLowerCase();
    return availableEpics.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.id.toString().includes(query),
    );
  }, [availableEpics, dependencySearch]);

  // Get dependency epic objects
  const dependencyEpics = useMemo(() => {
    if (!epic?.dependsOn) return [];
    return allEpics.filter((e) => epic.dependsOn?.includes(e.id));
  }, [epic, allEpics]);

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (!epic) return;

    try {
      await api.epics.updateEpic({
        id: epic.id,
        updateEpicRequest: {
          status: newStatus as "planning" | "active" | "completed",
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
      await api.epics.updateEpic({
        id: epic.id,
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
  const handleReleaseChange = async (releaseId: number | null) => {
    if (!epic) return;

    try {
      await api.epics.updateEpic({
        id: epic.id,
        updateEpicRequest: { releaseId },
      });
      fetchEpicData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update release";
      setError(message);
      console.error("Failed to update release:", err);
    }
  };

  // Handle description save
  const handleDescriptionSave = async () => {
    if (!epic) return;
    const trimmed = descriptionValue.trim();
    if (trimmed !== (epic.description ?? "")) {
      try {
        await api.epics.updateEpic({
          id: epic.id,
          updateEpicRequest: { description: trimmed || null },
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
    const trimmed = prdValue.trim();
    if (trimmed !== (epic.prdFilePath ?? "")) {
      try {
        await api.epics.updateEpic({
          id: epic.id,
          updateEpicRequest: { prdFilePath: trimmed || null },
        });
        fetchEpicData();
      } catch (err) {
        console.error("Failed to update PRD path:", err);
        setPrdValue(epic.prdFilePath ?? "");
      }
    }
    setEditingPrd(false);
  };

  // Handle add dependency
  const handleAddDependency = async (depEpicId: number) => {
    if (!epic) return;
    const currentDeps = epic.dependsOn ?? [];
    if (currentDeps.includes(depEpicId)) return;

    try {
      await api.epics.updateEpic({
        id: epic.id,
        updateEpicRequest: { dependsOn: [...currentDeps, depEpicId] },
      });
      fetchEpicData();
    } catch (err) {
      console.error("Failed to add dependency:", err);
    }
    setShowDependencyPicker(false);
    setDependencySearch("");
  };

  // Handle remove dependency
  const handleRemoveDependency = async (depEpicId: number) => {
    if (!epic) return;
    const currentDeps = epic.dependsOn ?? [];
    const newDeps = currentDeps.filter((id) => id !== depEpicId);

    try {
      await api.epics.updateEpic({
        id: epic.id,
        updateEpicRequest: { dependsOn: newDeps },
      });
      fetchEpicData();
    } catch (err) {
      console.error("Failed to remove dependency:", err);
    }
  };

  // Handle epic deletion
  const handleDelete = async () => {
    if (!epic) return;

    try {
      setDeleting(true);
      await api.epics.deleteEpic({ id: epic.id });
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
        epic={epic}
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
                      const isSelected = epic.dependsOn?.includes(e.id);
                      const epicPhase = e.phase ?? 1;
                      return (
                        <button
                          key={e.id}
                          onClick={() =>
                            isSelected
                              ? handleRemoveDependency(e.id)
                              : handleAddDependency(e.id)
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
                                #{e.id}
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
              {dependencyEpics.map((depEpic) => (
                <div
                  key={depEpic.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-system-100 dark:bg-system-700 rounded-lg text-sm"
                >
                  <Link
                    to={`/epics/${depEpic.id}`}
                    className="flex items-center gap-2 text-system-700 dark:text-system-300 hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    <span className="text-xs text-system-500 dark:text-system-400">
                      #{depEpic.id}
                    </span>
                    <span>{depEpic.title}</span>
                  </Link>
                  <button
                    onClick={() => handleRemoveDependency(depEpic.id)}
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
              ))}
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
                    TASK_STATUS_CONFIG.backlog;
                  return (
                    <tr
                      key={task.id}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="hover:bg-system-50 dark:hover:bg-system-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-system-500 dark:text-system-400 font-mono">
                            #{task.id}
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
